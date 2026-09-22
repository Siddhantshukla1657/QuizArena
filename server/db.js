/**
 * db.js - SQLite database using sql.js (pure WebAssembly, no native compilation)
 *
 * sql.js is entirely in-memory by default. We persist to a file on disk using
 * Node's fs module: read the file on startup, write it back after every mutation.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'quiz.db');

let db = null;

/** Persist the current DB state to disk */
function save() {
  if (!db) return;
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Initialise sql.js and load/create the SQLite file.
 * Must be awaited before anything else uses `getDb()`.
 */
async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL,
      time_limit_seconds INTEGER NOT NULL DEFAULT 20,
      points_value INTEGER NOT NULL DEFAULT 1000,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Seed sample quiz if empty
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM quizzes');
  let quizCount = 0;
  if (countStmt.step()) {
    quizCount = countStmt.getAsObject().c;
  }
  countStmt.free();

  if (quizCount === 0) {
    const seedQuizId = 'seed-sample-quiz';
    db.run('INSERT INTO quizzes (id, title) VALUES (?, ?)', [
      seedQuizId,
      'World Trivia & Science Showdown',
    ]);

    const sampleQuestions = [
      {
        id: 'q1',
        text: 'Which planet in our solar system has the most moons?',
        options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'],
        correct: 1, // Saturn
        time: 20,
        points: 1000,
        order: 0,
      },
      {
        id: 'q2',
        text: 'What is the fastest land animal in the world?',
        options: ['Cheetah', 'Pronghorn', 'Lion', 'Peregrine Falcon'],
        correct: 0, // Cheetah
        time: 15,
        points: 1000,
        order: 1,
      },
      {
        id: 'q3',
        text: 'What is the chemical symbol for Gold?',
        options: ['Ag', 'Fe', 'Au', 'Gd'],
        correct: 2, // Au
        time: 15,
        points: 1200,
        order: 2,
      },
      {
        id: 'q4',
        text: 'Which country invented the printing press?',
        options: ['China', 'Germany', 'England', 'Italy'],
        correct: 1, // Germany (Gutenberg)
        time: 20,
        points: 1000,
        order: 3,
      },
    ];

    for (const q of sampleQuestions) {
      db.run(
        'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [q.id, seedQuizId, q.text, JSON.stringify(q.options), q.correct, q.time, q.points, q.order]
      );
    }
  }

  save();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  return db;
}

/**
 * Thin wrappers that mirror the better-sqlite3 synchronous API so the route
 * handlers don't need to know about sql.js internals.
 */
function run(sql, params = []) {
  getDb().run(sql, params);
  save();
  return { changes: getDb().getRowsModified() };
}

function get(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params = []) {
  const stmt = getDb().prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { init, getDb, run, get, all, save };
