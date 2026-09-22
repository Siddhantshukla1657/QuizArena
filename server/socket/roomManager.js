/**
 * roomManager.js - In-memory room state
 *
 * Room shape:
 * {
 *   pin: string,
 *   quizId: string,
 *   quiz: { id, title, questions: [...] },  // full quiz loaded from DB
 *   hostSocketId: string,
 *   phase: 'lobby' | 'question-active' | 'question-closed' | 'leaderboard' | 'paused' | 'ended',
 *   currentQuestionIndex: number,
 *   questionStartedAt: number,  // Date.now() when question was broadcast
 *   timer: ReturnType<setTimeout> | null,
 *   players: Map<sessionToken, Player>,
 *   // answers for current question: Map<sessionToken, { optionIdx, receivedAt, score }>
 *   currentAnswers: Map<string, object>,
 *   previousRanks: Map<string, number>,  // for rank movement diff
 * }
 *
 * Player shape:
 * {
 *   sessionToken: string,
 *   nickname: string,
 *   socketId: string,
 *   score: number,
 *   connected: boolean,
 * }
 */

const rooms = new Map(); // pin → room

function generatePin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(pin));
  return pin;
}

function createRoom({ quizId, quiz, hostSocketId }) {
  const pin = generatePin();
  const room = {
    pin,
    quizId,
    quiz,
    hostSocketId,
    phase: 'lobby',
    currentQuestionIndex: -1,
    questionStartedAt: null,
    timer: null,
    players: new Map(),
    currentAnswers: new Map(),
    previousRanks: new Map(),
  };
  rooms.set(pin, room);
  return room;
}

function getRoom(pin) {
  return rooms.get(pin) || null;
}

function deleteRoom(pin) {
  const room = rooms.get(pin);
  if (room && room.timer) clearTimeout(room.timer);
  rooms.delete(pin);
}

function addPlayer(room, { sessionToken, nickname, socketId }) {
  room.players.set(sessionToken, {
    sessionToken,
    nickname,
    socketId,
    score: 0,
    connected: true,
  });
}

function getPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    nickname: p.nickname,
    score: p.score,
    connected: p.connected,
    sessionToken: p.sessionToken,
  }));
}

function isNicknameTaken(room, nickname) {
  return Array.from(room.players.values()).some(
    p => p.nickname.toLowerCase() === nickname.toLowerCase()
  );
}

function findPlayerByToken(room, sessionToken) {
  return room.players.get(sessionToken) || null;
}

function findPlayerBySocketId(room, socketId) {
  return Array.from(room.players.values()).find(p => p.socketId === socketId) || null;
}

function findRoomByHostSocket(socketId) {
  for (const room of rooms.values()) {
    if (room.hostSocketId === socketId) return room;
  }
  return null;
}

function findRoomByPlayerSocket(socketId) {
  for (const room of rooms.values()) {
    const player = findPlayerBySocketId(room, socketId);
    if (player) return { room, player };
  }
  return null;
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  getPlayerList,
  isNicknameTaken,
  findPlayerByToken,
  findPlayerBySocketId,
  findRoomByHostSocket,
  findRoomByPlayerSocket,
};
