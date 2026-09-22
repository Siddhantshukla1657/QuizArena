/**
 * reconnect.js - Session token issuance and reconnect handler
 */
const { v4: uuidv4 } = require('uuid');
const { getRoom, findPlayerByToken } = require('./roomManager');

function issueToken() {
  return uuidv4();
}

/**
 * Handle a player:reconnect event.
 * Restores the player's socket ID and sends a state-sync payload.
 */
function handleReconnect(io, socket, { pin, sessionToken, nickname }) {
  const room = getRoom(pin);
  if (!room) {
    socket.emit('reconnect:error', { message: 'Room not found or has ended' });
    return;
  }

  const player = findPlayerByToken(room, sessionToken);

  if (player) {
    // Restore existing player
    player.socketId = socket.id;
    player.connected = true;

    // Put the socket back in the room channels
    socket.join(`room:${pin}:players`);

    // Send state sync
    const statePayload = buildStateSync(room, sessionToken);
    socket.emit('reconnect:success', { nickname: player.nickname, ...statePayload });
  } else if (room.phase === 'lobby') {
    // Late join during lobby - treat as a fresh join (nickname check)
    socket.emit('reconnect:error', { message: 'Session not found. Please join again.' });
  } else {
    socket.emit('reconnect:error', { message: 'Session not found. Please join again.' });
  }
}

function buildStateSync(room, sessionToken) {
  const player = room.players.get(sessionToken);
  const base = {
    phase: room.phase,
    score: player ? player.score : 0,
  };

  if (room.phase === 'question-active') {
    const question = room.quiz.questions[room.currentQuestionIndex];
    const elapsed = Date.now() - room.questionStartedAt;
    const remaining = Math.max(0, question.time_limit_seconds * 1000 - elapsed);
    return {
      ...base,
      question: {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.quiz.questions.length,
        text: question.text,
        options: question.options,
        timeLimitSeconds: question.time_limit_seconds,
        remainingMs: remaining,
        alreadyAnswered: room.currentAnswers.has(sessionToken),
      },
    };
  }

  return base;
}

module.exports = { issueToken, handleReconnect };
