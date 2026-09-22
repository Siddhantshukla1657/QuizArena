/**
 * loadtest/simulate.js
 *
 * Load test simulator: Spawns N concurrent Socket.IO clients to stress-test
 * room joining, answer submission storm, and real-time leaderboard broadcast.
 *
 * Usage:
 *   node loadtest/simulate.js [--clients 100] [--url http://localhost:3001] [--pin 123456]
 */

const { io } = require('socket.io-client');
const http = require('http');

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

const SERVER_URL = getArg('--url', 'http://localhost:3001');
const CLIENT_COUNT = parseInt(getArg('--clients', getArg('-n', '100')), 10);
const TARGET_PIN = getArg('--pin', null);
const MIN_DELAY_MS = parseInt(getArg('--delay-min', '50'), 10);
const MAX_DELAY_MS = parseInt(getArg('--delay-max', '1500'), 10);

console.log('='.repeat(60));
console.log('🚀 QuizArena Load Test Simulator');
console.log(`   Target Server:  ${SERVER_URL}`);
console.log(`   Concurrent:     ${CLIENT_COUNT} clients`);
console.log(`   Answer Jitter:  ${MIN_DELAY_MS}ms – ${MAX_DELAY_MS}ms`);
console.log('='.repeat(60));

// Fetch quizzes from REST API to get a quizId for test room
function fetchFirstQuiz(url) {
  return new Promise((resolve, reject) => {
    http.get(`${url}/api/quizzes`, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const quizzes = JSON.parse(raw);
          if (quizzes.length > 0) resolve(quizzes[0].id);
          else reject(new Error('No quizzes found in database. Run server first to seed database.'));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  let pin = TARGET_PIN;
  let hostSocket = null;

  // If no PIN provided, setup host room automatically
  if (!pin) {
    console.log('\n[Host] Creating automated test room via host socket...');
    let quizId;
    try {
      quizId = await fetchFirstQuiz(SERVER_URL);
    } catch (err) {
      console.error('❌ Failed to reach REST API:', err.message);
      process.exit(1);
    }

    hostSocket = io(SERVER_URL, { reconnection: false, transports: ['websocket'] });

    await new Promise((resolve, reject) => {
      hostSocket.on('connect', () => {
        hostSocket.emit('room:create', { quizId });
      });

      hostSocket.on('room:created', (data) => {
        pin = data.pin;
        console.log(`✅ [Host] Room created with PIN: ${pin} ("${data.quizTitle}", ${data.questionCount} questions)`);
        resolve();
      });

      hostSocket.on('room:error', (err) => {
        reject(new Error(`Host room error: ${err.message}`));
      });

      setTimeout(() => reject(new Error('Host socket connection timeout')), 5000);
    });
  }

  // Phase 1: Connect & Join N clients
  console.log(`\n[Clients] Spawning ${CLIENT_COUNT} players to join room ${pin}...`);
  const joinStartTime = Date.now();

  const clients = [];
  const metrics = {
    joined: 0,
    joinFailed: 0,
    answersSubmitted: 0,
    answersAccepted: 0,
    answersRejected: 0,
    latencies: [],
    resultsReceived: 0,
  };

  const joinPromises = [];

  for (let i = 1; i <= CLIENT_COUNT; i++) {
    const p = new Promise((resolve) => {
      const nickname = `Tester_${String(i).padStart(3, '0')}`;
      const socket = io(SERVER_URL, {
        reconnection: false,
        transports: ['websocket'],
      });

      const clientObj = {
        id: i,
        nickname,
        socket,
        sessionToken: null,
      };
      clients.push(clientObj);

      socket.on('connect', () => {
        socket.emit('room:join', { pin, nickname });
      });

      socket.on('room:join:success', ({ sessionToken }) => {
        clientObj.sessionToken = sessionToken;
        metrics.joined++;
        resolve(true);
      });

      socket.on('room:join:error', () => {
        metrics.joinFailed++;
        resolve(false);
      });

      socket.on('connect_error', () => {
        metrics.joinFailed++;
        resolve(false);
      });
    });

    joinPromises.push(p);
  }

  await Promise.all(joinPromises);
  const joinDuration = ((Date.now() - joinStartTime) / 1000).toFixed(2);
  console.log(`✅ [Clients] ${metrics.joined}/${CLIENT_COUNT} joined in ${joinDuration}s (${metrics.joinFailed} failed)`);

  if (metrics.joined === 0) {
    console.error('❌ No clients succeeded in joining. Aborting test.');
    cleanup();
    process.exit(1);
  }

  // Phase 2: Start question and benchmark answer storm
  console.log('\n[Storm] Starting Question 1 to trigger concurrent answer burst...');

  const questionDonePromise = new Promise((resolve) => {
    let questionEnded = false;

    for (const c of clients) {
      c.socket.on('question:show', (question) => {
        // Compute random jitter between MIN_DELAY_MS and MAX_DELAY_MS
        const jitter = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)) + MIN_DELAY_MS;
        setTimeout(() => {
          if (!c.sessionToken) return;
          const optionIdx = Math.floor(Math.random() * (question.options?.length || 4));
          const sendTime = Date.now();
          metrics.answersSubmitted++;

          c.socket.emit('answer:submit', {
            pin,
            sessionToken: c.sessionToken,
            optionIdx,
          });

          c.socket.once('answer:ack', ({ accepted }) => {
            const rtt = Date.now() - sendTime;
            metrics.latencies.push(rtt);
            if (accepted) {
              metrics.answersAccepted++;
            } else {
              metrics.answersRejected++;
            }
          });
        }, jitter);
      });

      c.socket.on('question:results', () => {
        metrics.resultsReceived++;
        if (!questionEnded) {
          questionEnded = true;
          // Give brief buffer for all clients to finish receiving results
          setTimeout(resolve, 800);
        }
      });
    }
  });

  // Trigger host start
  if (hostSocket) {
    hostSocket.emit('host:control', { pin, action: 'start' });
  } else {
    console.log(`👉 Notice: Please click 'Start Quiz' in the host dashboard for PIN ${pin}...`);
  }

  // Wait for question to complete or max 25s
  await Promise.race([
    questionDonePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Test timed out waiting for question:results')), 35000)),
  ]);

  // Phase 3: Analysis & Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOAD TEST BENCHMARK RESULTS');
  console.log('='.repeat(60));

  const droppedAnswers = metrics.answersSubmitted - (metrics.answersAccepted + metrics.answersRejected);
  const avgLatency = metrics.latencies.length
    ? (metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length).toFixed(1)
    : 0;
  const minLatency = metrics.latencies.length ? Math.min(...metrics.latencies) : 0;
  const maxLatency = metrics.latencies.length ? Math.max(...metrics.latencies) : 0;

  console.log(`  Total Concurrent Clients:   ${CLIENT_COUNT}`);
  console.log(`  Successful Joins:           ${metrics.joined} (${((metrics.joined / CLIENT_COUNT) * 100).toFixed(1)}%)`);
  console.log(`  Answers Submitted:          ${metrics.answersSubmitted}`);
  console.log(`  Answers Accepted:           ${metrics.answersAccepted}`);
  console.log(`  Answers Rejected:           ${metrics.answersRejected}`);
  console.log(`  Answers Dropped (Target 0): ${droppedAnswers}`);
  console.log(`  Answer ACK Latency:         avg ${avgLatency}ms | min ${minLatency}ms | max ${maxLatency}ms`);
  console.log(`  Clients Receiving Results:  ${metrics.resultsReceived}`);
  console.log('='.repeat(60));

  function cleanup() {
    if (hostSocket) {
      hostSocket.emit('host:control', { pin, action: 'end' });
      hostSocket.disconnect();
    }
    for (const c of clients) {
      c.socket.disconnect();
    }
  }

  cleanup();

  if (droppedAnswers === 0 && metrics.answersAccepted === metrics.joined) {
    console.log('🎉 TEST RESULT: SUCCESS (0 Dropped Answers, 100% Accepted under high concurrency)\n');
    process.exit(0);
  } else {
    console.log(`⚠️  TEST RESULT: FAILED (${droppedAnswers} dropped answers or incomplete answers)\n`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Load test failed with exception:', err);
  process.exit(1);
});
