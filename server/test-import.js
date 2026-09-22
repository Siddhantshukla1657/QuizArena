/**
 * Test script for quiz import & export functionality
 */
const http = require('http');
const express = require('express');
const db = require('./db');
const quizRoutes = require('./routes/quizzes');

async function runTests() {
  console.log('🚀 Starting import/export tests...');
  await db.init();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/quizzes', quizRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/quizzes`;

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(baseUrl + path);
      const req = http.request(
        url,
        {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = data ? JSON.parse(data) : null;
              resolve({ status: res.statusCode, body: json, headers: res.headers });
            } catch (err) {
              resolve({ status: res.statusCode, body: data, headers: res.headers });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Standard Single Quiz Import
    console.log('\n--- Test 1: Standard Single Quiz Import ---');
    const singleQuiz = {
      title: 'Cosmic Trivia',
      questions: [
        {
          text: 'What is the closest star to Earth?',
          options: ['Proxima Centauri', 'The Sun', 'Betelgeuse', 'Sirius'],
          correct_option_index: 1,
          time_limit_seconds: 15,
          points_value: 1200,
        },
        {
          text: 'How many planets are in our solar system?',
          options: ['7', '8', '9', '10'],
          correct_option_index: 1,
        },
      ],
    };

    const res1 = await request('POST', '/import', singleQuiz);
    assert(res1.status === 201, 'Returns 201 Created');
    assert(res1.body.quizzes && res1.body.quizzes.length === 1, 'Imported 1 quiz');
    assert(res1.body.quizzes[0].title === 'Cosmic Trivia', 'Quiz title matches');
    assert(res1.body.quizzes[0].questionCount === 2, 'Question count is 2');

    const importedQuizId = res1.body.quizzes[0].id;

    // 2. Verify imported quiz via GET /:id
    console.log('\n--- Test 2: Fetch Imported Quiz ---');
    const res2 = await request('GET', `/${importedQuizId}`);
    assert(res2.status === 200, 'Returns 200 OK');
    assert(res2.body.title === 'Cosmic Trivia', 'Fetched quiz title matches');
    assert(res2.body.questions.length === 2, 'Has 2 questions');
    assert(res2.body.questions[0].correct_option_index === 1, 'Correct option index preserved');
    assert(res2.body.questions[0].time_limit_seconds === 15, 'Time limit preserved');
    assert(res2.body.questions[0].points_value === 1200, 'Points value preserved');
    assert(res2.body.questions[1].time_limit_seconds === 20, 'Default time limit applied');
    assert(res2.body.questions[1].points_value === 1000, 'Default points applied');

    // 3. Export Quiz
    console.log('\n--- Test 3: Export Quiz ---');
    const res3 = await request('GET', `/${importedQuizId}/export`);
    assert(res3.status === 200, 'Returns 200 OK for export');
    assert(res3.body.title === 'Cosmic Trivia', 'Exported title matches');
    assert(res3.body.questions && res3.body.questions.length === 2, 'Exported 2 questions');

    // 4. Flexible Format Import (AI / Kahoot variations: answer string, letter, object options)
    console.log('\n--- Test 4: Flexible Format Import ---');
    const flexibleData = {
      name: 'Flexible Science Quiz',
      questions: [
        {
          question: 'What is the chemical formula for water?',
          choices: [
            { text: 'CO2', isCorrect: false },
            { text: 'H2O', isCorrect: true },
            { text: 'NaCl', isCorrect: false },
          ],
        },
        {
          prompt: 'Which element is liquid at room temperature?',
          answers: ['Mercury', 'Iron', 'Copper', 'Gold'],
          answer: 'Mercury', // string matching
        },
        {
          text: 'Which is the fastest bird?',
          options: ['Eagle', 'Peregrine Falcon', 'Swift', 'Ostrich'],
          correct: 'B', // letter index matching 'B' -> 1
        },
      ],
    };

    const res4 = await request('POST', '/import', flexibleData);
    assert(res4.status === 201, 'Flexible format accepted with 201');
    assert(res4.body.quizzes[0].questionCount === 3, 'All 3 flexible questions parsed');

    const flexQuiz = await request('GET', `/${res4.body.quizzes[0].id}`);
    assert(flexQuiz.body.questions[0].correct_option_index === 1, 'Object isCorrect detected');
    assert(flexQuiz.body.questions[1].correct_option_index === 0, 'Answer string matched to index');
    assert(flexQuiz.body.questions[2].correct_option_index === 1, 'Letter "B" matched to index 1');

    // 5. Multi-Quiz Batch Import
    console.log('\n--- Test 5: Multi-Quiz Batch Import ---');
    const multiBatch = [
      {
        title: 'Batch Quiz Alpha',
        questions: [{ text: 'Question 1', options: ['A', 'B'], correct_option_index: 0 }],
      },
      {
        title: 'Batch Quiz Beta',
        questions: [{ text: 'Question 2', options: ['X', 'Y'], correct_option_index: 1 }],
      },
    ];

    const res5 = await request('POST', '/import', multiBatch);
    assert(res5.status === 201, 'Batch import returns 201');
    assert(res5.body.quizzes.length === 2, 'Imported 2 quizzes in batch');

    // 6. Import Questions into Existing Quiz
    console.log('\n--- Test 6: Import Questions into Existing Quiz ---');
    const questionsToAppend = [
      {
        text: 'What galaxy are we in?',
        options: ['Andromeda', 'Milky Way', 'Triangulum', 'Sombrero'],
        correct_option_index: 1,
      },
    ];
    const res6 = await request('POST', `/${importedQuizId}/import-questions`, questionsToAppend);
    assert(res6.status === 201, 'Append questions returns 201');
    assert(res6.body.questions.length === 1, '1 question appended');

    const updatedQuiz = await request('GET', `/${importedQuizId}`);
    assert(updatedQuiz.body.questions.length === 3, 'Quiz now has 3 questions');

    // 7. Validation Error Handling
    console.log('\n--- Test 7: Validation Error Handling ---');
    const invalidEmpty = {};
    const res7a = await request('POST', '/import', invalidEmpty);
    assert(res7a.status === 400, 'Rejects empty object with 400');

    const invalidNoOptions = {
      title: 'Bad Quiz',
      questions: [{ text: 'No options' }],
    };
    const res7b = await request('POST', '/import', invalidNoOptions);
    assert(res7b.status === 400, 'Rejects question without options with 400');

    const invalidCorrectIndex = {
      title: 'Bad Index Quiz',
      questions: [{ text: 'Out of bounds', options: ['A', 'B'], correct_option_index: 99 }],
    };
    const res7c = await request('POST', '/import', invalidCorrectIndex);
    assert(res7c.status === 400, 'Rejects out-of-bounds correct index with 400');

    console.log(`\n========================================`);
    console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`========================================\n`);

    // Clean up created quizzes
    const testTitles = ['Cosmic Trivia', 'Flexible Science Quiz', 'Batch Quiz Alpha', 'Batch Quiz Beta'];
    for (const t of testTitles) {
      db.run('DELETE FROM quizzes WHERE title = ?', [t]);
    }
    db.save();

    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
