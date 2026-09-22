/**
 * Test script to verify answer hiding and auto-reveal behavior.
 */
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const db = require('./db');
const socketHandler = require('./socket');

let passCount = 0;
let failCount = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failCount++;
  }
}

async function runTest() {
  console.log('🧪 Starting answer reveal & auto-advance tests...');
  await db.init();
  console.log('  Database initialized.');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  socketHandler(io);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`  Test server listening on ${serverUrl}`);

  // 1. Insert test quiz with two questions (one for all-answered test, one for timeout test)
  const quizId = 'reveal-test-' + Date.now();
  db.run('INSERT INTO quizzes (id, title) VALUES (?, ?)', [quizId, 'Answer Reveal Test Quiz']);
  db.run(
    'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ['q1-' + Date.now(), quizId, 'What is the capital of France?', JSON.stringify(['London', 'Paris', 'Berlin', 'Madrid']), 1, 15, 1000, 0]
  );
  db.run(
    'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ['q2-' + Date.now(), quizId, 'What is 2 + 2?', JSON.stringify(['3', '4', '5', '6']), 1, 2, 1000, 1]
  );
  console.log('  Test quiz seeded.');

  // 2. Connect host socket
  const hostSocket = ioClient(serverUrl, { transports: ['websocket'], forceNew: true });
  await new Promise((res) => hostSocket.on('connect', res));

  // Host creates room
  const createRoomPromise = new Promise((res) => {
    hostSocket.on('room:created', (data) => res(data));
  });
  hostSocket.emit('room:create', { quizId });
  const roomData = await createRoomPromise;
  const pin = roomData.pin;
  assert(!!pin, `Room created with PIN: ${pin}`);

  // 3. Connect 2 players
  const player1 = ioClient(serverUrl, { transports: ['websocket'], forceNew: true });
  const player2 = ioClient(serverUrl, { transports: ['websocket'], forceNew: true });
  await Promise.all([
    new Promise((res) => player1.on('connect', res)),
    new Promise((res) => player2.on('connect', res)),
  ]);

  const p1JoinPromise = new Promise((res) => player1.on('room:join:success', res));
  const p2JoinPromise = new Promise((res) => player2.on('room:join:success', res));

  player1.emit('room:join', { pin, nickname: 'Alice' });
  player2.emit('room:join', { pin, nickname: 'Bob' });

  const p1Joined = await p1JoinPromise;
  const p2Joined = await p2JoinPromise;

  assert(p1Joined.nickname === 'Alice', 'Player 1 (Alice) joined');
  assert(p2Joined.nickname === 'Bob', 'Player 2 (Bob) joined');

  // 4. Host starts question 1
  console.log('\n--- Test 1: Question Show Payload Safety ---');
  let hostReceivedQuestion = null;
  let p1ReceivedQuestion = null;

  const hostShowPromise = new Promise((res) => {
    hostSocket.on('question:show', (data) => {
      hostReceivedQuestion = data;
      res(data);
    });
  });

  const p1ShowPromise = new Promise((res) => {
    player1.on('question:show', (data) => {
      p1ReceivedQuestion = data;
      res(data);
    });
  });

  hostSocket.emit('host:control', { pin, action: 'start' });
  await Promise.all([hostShowPromise, p1ShowPromise]);

  // VERIFY HOST AND PLAYER DO NOT GET CORRECT ANSWER DURING QUESTION
  assert(
    hostReceivedQuestion.correctOptionIndex === undefined,
    'Host question:show does NOT contain correctOptionIndex'
  );
  assert(
    hostReceivedQuestion.correct_option_index === undefined,
    'Host question:show does NOT contain correct_option_index'
  );
  assert(
    p1ReceivedQuestion.correctOptionIndex === undefined,
    'Player question:show does NOT contain correctOptionIndex'
  );
  assert(
    hostReceivedQuestion.text === 'What is the capital of France?',
    'Host received question text'
  );

  // 5. Submit answers for both players & verify auto-advance
  console.log('\n--- Test 2: Auto-advance & Answer Reveal when all players answer ---');
  const startTime = Date.now();

  const hostResultsPromise = new Promise((res) => {
    hostSocket.once('question:results', (data) => res(data));
  });

  const p1ResultsPromise = new Promise((res) => {
    player1.once('question:results', (data) => res(data));
  });

  // Submit Player 1 answer
  player1.emit('answer:submit', {
    pin,
    sessionToken: p1Joined.sessionToken,
    optionIdx: 1, // correct: Paris
  });

  // Submit Player 2 answer
  player2.emit('answer:submit', {
    pin,
    sessionToken: p2Joined.sessionToken,
    optionIdx: 0, // incorrect: London
  });

  const [hostResults, p1Results] = await Promise.all([hostResultsPromise, p1ResultsPromise]);
  const elapsedMs = Date.now() - startTime;

  assert(
    elapsedMs < 3000,
    `Question auto-closed in ${elapsedMs}ms (< 3s, far before 15s timer)`
  );
  assert(
    hostResults.correctOptionIndex === 1,
    'Host received correctOptionIndex = 1 in question:results'
  );
  assert(
    hostResults.question && hostResults.question.options[1] === 'Paris',
    'Host received question details in question:results'
  );
  assert(
    p1Results.correctOptionIndex === 1,
    'Player 1 received correctOptionIndex = 1 in question:results'
  );
  assert(p1Results.personal.correct === true, 'Player 1 marked as correct');
  assert(p1Results.personal.pointsEarned > 0, 'Player 1 earned points');

  // 6. Test Timer Expiration Reveal (Question 2 has 2 second timer, nobody answers)
  console.log('\n--- Test 3: Answer Reveal after Timer Expires ---');
  const q2ShowPromise = new Promise((res) => {
    hostSocket.once('question:show', res);
  });
  hostSocket.emit('host:control', { pin, action: 'next' });
  const q2Data = await q2ShowPromise;
  assert(q2Data.correctOptionIndex === undefined, 'Q2 host payload has no correct answer');

  const q2StartTime = Date.now();
  const q2ResultsPromise = new Promise((res) => {
    hostSocket.once('question:results', res);
  });
  const q2Results = await q2ResultsPromise;
  const q2Elapsed = Date.now() - q2StartTime;

  assert(
    q2Elapsed >= 1900 && q2Elapsed <= 3000,
    `Q2 timer expired naturally after ~2s (${q2Elapsed}ms)`
  );
  assert(
    q2Results.correctOptionIndex === 1,
    'Q2 correct answer revealed upon timer expiration'
  );

  // Cleanup
  hostSocket.disconnect();
  player1.disconnect();
  player2.disconnect();
  await new Promise((res) => server.close(res));

  console.log('\n========================================');
  console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('========================================\n');

  if (failCount > 0) process.exit(1);
  else process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
