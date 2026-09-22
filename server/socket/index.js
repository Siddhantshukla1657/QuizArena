/**
 * socket/index.js - Register all Socket.IO event handlers
 */
const db = require('../db');
const {
  createRoom, getRoom, deleteRoom, addPlayer,
  getPlayerList, isNicknameTaken, findPlayerByToken,
  findRoomByHostSocket, findRoomByPlayerSocket,
} = require('./roomManager');
const { startQuestion, closeQuestion, submitAnswer, computeLeaderboard } = require('./gameEngine');
const { issueToken, handleReconnect } = require('./reconnect');

module.exports = function registerSocketHandlers(io) {

  io.on('connection', (socket) => {

    // ── Host: Create a room ────────────────────────────────────────────────
    socket.on('room:create', ({ quizId }) => {
      const quiz = db.get('SELECT * FROM quizzes WHERE id = ?', [quizId]);
      if (!quiz) {
        socket.emit('room:error', { message: 'Quiz not found' });
        return;
      }
      const questions = db
        .all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC', [quizId])
        .map(q => ({ ...q, options: JSON.parse(q.options_json) }));

      if (questions.length === 0) {
        socket.emit('room:error', { message: 'Quiz has no questions' });
        return;
      }

      const room = createRoom({ quizId, quiz: { ...quiz, questions }, hostSocketId: socket.id });
      socket.join(`room:${room.pin}:host`);
      socket.emit('room:created', { pin: room.pin, quizTitle: quiz.title, questionCount: questions.length });
    });

    // ── Player: Join a room ────────────────────────────────────────────────
    socket.on('room:join', ({ pin, nickname }) => {
      const room = getRoom(pin);
      if (!room) {
        socket.emit('room:join:error', { message: 'No active quiz with that PIN' });
        return;
      }
      if (room.phase !== 'lobby') {
        socket.emit('room:join:error', { message: 'Quiz has already started' });
        return;
      }
      if (!nickname || !nickname.trim()) {
        socket.emit('room:join:error', { message: 'Nickname is required' });
        return;
      }
      if (isNicknameTaken(room, nickname.trim())) {
        socket.emit('room:join:error', { message: 'Nickname already taken in this room' });
        return;
      }

      const sessionToken = issueToken();
      addPlayer(room, { sessionToken, nickname: nickname.trim(), socketId: socket.id });

      socket.join(`room:${pin}:players`);
      socket.emit('room:join:success', { sessionToken, nickname: nickname.trim(), pin });

      // Broadcast updated player list to host
      io.to(`room:${pin}:host`).emit('lobby:update', {
        players: getPlayerList(room),
        count: room.players.size,
      });
    });

    // ── Player: Submit an answer ───────────────────────────────────────────
    socket.on('answer:submit', ({ pin, sessionToken, optionIdx }) => {
      const room = getRoom(pin);
      if (!room) return;

      const accepted = submitAnswer(room, sessionToken, optionIdx);
      if (accepted) {
        socket.emit('answer:ack', { accepted: true });

        // Immediate count update to host
        io.to(`room:${room.pin}:host`).emit('answer:count', {
          answered: room.currentAnswers.size,
          total: room.players.size,
        });

        // Check if all players have answered
        // Only close early if ALL registered players in the room have answered
        const allAnswered =
          room.players.size > 0 &&
          room.currentAnswers.size >= room.players.size;

        if (allAnswered) {
          if (room.timer) {
            clearTimeout(room.timer);
            room.timer = null;
          }
          setTimeout(() => {
            if (room.phase === 'question-active') {
              closeQuestion(io, room);
            }
          }, 400);
        }
      } else {
        socket.emit('answer:ack', { accepted: false, reason: room.phase !== 'question-active' ? 'time_up' : 'already_submitted' });
      }
    });

    // ── Host: Controls (start/pause/skip/end) ─────────────────────────────
    socket.on('host:control', ({ pin, action }) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      switch (action) {
        case 'start': {
          if (room.phase !== 'lobby') return;
          room.currentQuestionIndex = 0;
          startQuestion(io, room);
          break;
        }
        case 'next': {
          if (room.phase !== 'leaderboard') return;
          room.currentQuestionIndex += 1;
          if (room.currentQuestionIndex >= room.quiz.questions.length) {
            // All questions done
            room.phase = 'ended';
            const leaderboard = computeLeaderboard(room);
            io.to(`room:${pin}:players`).emit('quiz:ended', { leaderboard });
            io.to(`room:${pin}:host`).emit('quiz:ended', { leaderboard });
          } else {
            startQuestion(io, room);
          }
          break;
        }
        case 'skip': {
          if (room.phase !== 'question-active' && room.phase !== 'paused') return;
          closeQuestion(io, room);
          break;
        }
        case 'pause': {
          if (room.phase !== 'question-active') return;
          room.phase = 'paused';
          if (room.timer) { clearTimeout(room.timer); room.timer = null; }
          room._pausedAt = Date.now();
          room._remainingMs = Math.max(
            0,
            room.quiz.questions[room.currentQuestionIndex].time_limit_seconds * 1000 -
              (Date.now() - room.questionStartedAt)
          );
          io.to(`room:${pin}:players`).emit('quiz:paused');
          io.to(`room:${pin}:host`).emit('quiz:paused');
          break;
        }
        case 'resume': {
          if (room.phase !== 'paused') return;
          room.phase = 'question-active';
          room.questionStartedAt = Date.now() - (room.quiz.questions[room.currentQuestionIndex].time_limit_seconds * 1000 - room._remainingMs);
          room.timer = setTimeout(() => closeQuestion(io, room), room._remainingMs);
          io.to(`room:${pin}:players`).emit('quiz:resumed');
          io.to(`room:${pin}:host`).emit('quiz:resumed');
          break;
        }
        case 'end': {
          room.phase = 'ended';
          if (room.timer) clearTimeout(room.timer);
          const leaderboard = computeLeaderboard(room);
          io.to(`room:${pin}:players`).emit('quiz:ended', { leaderboard });
          io.to(`room:${pin}:host`).emit('quiz:ended', { leaderboard });
          deleteRoom(pin);
          break;
        }
      }
    });

    // ── Player: Reconnect ──────────────────────────────────────────────────
    socket.on('player:reconnect', ({ pin, sessionToken, nickname }) => {
      handleReconnect(io, socket, { pin, sessionToken, nickname });
    });

    // ── Disconnect handling ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Check if this was a host socket
      const hostRoom = findRoomByHostSocket(socket.id);
      if (hostRoom) {
        // Host disconnected - give a grace period before tearing down
        hostRoom._hostDisconnectTimer = setTimeout(() => {
          if (hostRoom.hostSocketId === socket.id) {
            io.to(`room:${hostRoom.pin}:players`).emit('room:closed', { reason: 'Host disconnected' });
            deleteRoom(hostRoom.pin);
          }
        }, 30000); // 30s grace
        return;
      }

      // Check if this was a player socket
      const result = findRoomByPlayerSocket(socket.id);
      if (result) {
        const { room, player } = result;
        player.connected = false;
        // Notify host
        io.to(`room:${room.pin}:host`).emit('lobby:update', {
          players: getPlayerList(room),
          count: room.players.size,
        });
      }
    });

    // If host reconnects, cancel the teardown timer
    socket.on('host:reconnect', ({ pin }) => {
      const room = getRoom(pin);
      if (!room) return;
      if (room._hostDisconnectTimer) {
        clearTimeout(room._hostDisconnectTimer);
        room._hostDisconnectTimer = null;
      }
      room.hostSocketId = socket.id;
      socket.join(`room:${pin}:host`);
      socket.emit('host:reconnect:success', { pin });
    });

  });
};
