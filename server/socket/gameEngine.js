/**
 * gameEngine.js - Timer, scoring, leaderboard computation
 */
const roomManager = require('./roomManager');

const THROTTLE_INTERVAL_MS = 250; // max 4 answer-count broadcasts/sec

/**
 * Start broadcasting a question to the room.
 * @param {object} io - Socket.IO server instance
 * @param {object} room - Room object
 */
function startQuestion(io, room) {
  const question = room.quiz.questions[room.currentQuestionIndex];
  if (!question) return;

  room.phase = 'question-active';
  room.questionStartedAt = Date.now();
  room.currentAnswers = new Map();

  // Question payload - correct_option_index is intentionally excluded for both players and host
  const questionPayload = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.quiz.questions.length,
    text: question.text,
    options: question.options,
    timeLimitSeconds: question.time_limit_seconds,
    pointsValue: question.points_value,
  };

  io.to(`room:${room.pin}:players`).emit('question:show', questionPayload);
  io.to(`room:${room.pin}:host`).emit('question:show', questionPayload);

  // Set server-side timer
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    closeQuestion(io, room);
  }, question.time_limit_seconds * 1000);

  // Setup throttled answer-count broadcaster
  if (room._countInterval) clearInterval(room._countInterval);
  room._countInterval = setInterval(() => {
    if (room.phase !== 'question-active') {
      clearInterval(room._countInterval);
      return;
    }
    io.to(`room:${room.pin}:host`).emit('answer:count', {
      answered: room.currentAnswers.size,
      total: room.players.size,
    });
  }, THROTTLE_INTERVAL_MS);
}

/**
 * Called when the server-side timer expires OR host skips.
 */
function closeQuestion(io, room) {
  if (room.phase === 'question-closed' || room.phase === 'ended') return;

  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  if (room._countInterval) { clearInterval(room._countInterval); room._countInterval = null; }

  room.phase = 'question-closed';

  const question = room.quiz.questions[room.currentQuestionIndex];

  // Finalize: compute leaderboard and broadcast results
  const leaderboard = computeLeaderboard(room);

  // Build personal results map
  const personalResults = {};
  for (const [token, player] of room.players) {
    const answer = room.currentAnswers.get(token);
    personalResults[token] = {
      answered: !!answer,
      selectedOption: answer ? answer.optionIdx : null,
      correct: answer ? answer.optionIdx === question.correct_option_index : false,
      pointsEarned: answer ? answer.score : 0,
      totalScore: player.score,
    };
  }

  const isLast = room.currentQuestionIndex === room.quiz.questions.length - 1;

  const payload = {
    correctOptionIndex: question.correct_option_index,
    question: {
      text: question.text,
      options: question.options,
    },
    leaderboard,
    isLastQuestion: isLast,
  };

  // Broadcast to everyone - each player's personal result included
  for (const [token, player] of room.players) {
    if (player.connected && player.socketId) {
      io.to(player.socketId).emit('question:results', {
        ...payload,
        personal: personalResults[token],
      });
    }
  }

  io.to(`room:${room.pin}:host`).emit('question:results', {
    ...payload,
    personalResults, // host gets all
  });

  room.phase = 'leaderboard';
}

/**
 * Submit an answer for a player. Returns true if accepted.
 */
function submitAnswer(room, sessionToken, optionIdx) {
  if (room.phase !== 'question-active') return false;
  if (room.currentAnswers.has(sessionToken)) return false; // idempotent

  const player = room.players.get(sessionToken);
  if (!player) return false;

  const question = room.quiz.questions[room.currentQuestionIndex];
  const now = Date.now();
  const timeTakenMs = now - room.questionStartedAt;
  const timeLimitMs = question.time_limit_seconds * 1000;

  const isCorrect = optionIdx === question.correct_option_index;
  let score = 0;
  if (isCorrect) {
    // floor at 50% of base points for a last-second correct answer
    const ratio = Math.min(timeTakenMs / timeLimitMs, 1);
    score = Math.round(question.points_value * (1 - ratio * 0.5));
  }

  room.currentAnswers.set(sessionToken, { optionIdx, receivedAt: now, score });
  player.score += score;

  return true;
}

/**
 * Sort players by score descending, compute rank, diff vs. previous.
 */
function computeLeaderboard(room) {
  const players = Array.from(room.players.values());

  // Sort by score desc, then by earliest answer for tie-break
  players.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aAns = room.currentAnswers.get(a.sessionToken);
    const bAns = room.currentAnswers.get(b.sessionToken);
    const aTime = aAns ? aAns.receivedAt : Infinity;
    const bTime = bAns ? bAns.receivedAt : Infinity;
    return aTime - bTime;
  });

  const leaderboard = players.map((p, idx) => {
    const rank = idx + 1;
    const prev = room.previousRanks.get(p.sessionToken);
    let movement = 'same';
    if (prev !== undefined) {
      if (rank < prev) movement = 'up';
      else if (rank > prev) movement = 'down';
    }
    room.previousRanks.set(p.sessionToken, rank);
    return { rank, nickname: p.nickname, score: p.score, movement, sessionToken: p.sessionToken };
  });

  return leaderboard;
}

module.exports = { startQuestion, closeQuestion, submitAnswer, computeLeaderboard };
