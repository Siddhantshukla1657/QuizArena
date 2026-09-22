const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = Router();

// ─── Quizzes ──────────────────────────────────────────────────────────────────

// List all quizzes
router.get('/', (req, res) => {
  const quizzes = db.all('SELECT * FROM quizzes ORDER BY created_at DESC');
  const result = quizzes.map(q => ({
    ...q,
    questionCount: (db.get('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?', [q.id]) || { count: 0 }).count,
  }));
  res.json(result);
});

// Create a quiz
router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  db.run('INSERT INTO quizzes (id, title) VALUES (?, ?)', [id, title.trim()]);
  res.status(201).json({ id, title: title.trim() });
});

// Get a quiz with its questions
router.get('/:id', (req, res) => {
  const quiz = db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const questions = db
    .all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC', [req.params.id])
    .map(q => ({ ...q, options: JSON.parse(q.options_json) }));
  res.json({ ...quiz, questions });
});

// Update quiz title
router.put('/:id', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  db.run('UPDATE quizzes SET title = ? WHERE id = ?', [title.trim(), req.params.id]);
  res.json({ id: req.params.id, title: title.trim() });
});

// Delete a quiz
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM questions WHERE quiz_id = ?', [req.params.id]);
  db.run('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

// ─── Import & Export ─────────────────────────────────────────────────────────

function normalizeAndValidateQuestion(rawQ, qIndex = 0) {
  if (!rawQ || typeof rawQ !== 'object') {
    throw new Error(`Question #${qIndex + 1}: Invalid question format.`);
  }

  const text = (rawQ.text || rawQ.question || rawQ.prompt || rawQ.title || '').toString().trim();
  if (!text) {
    throw new Error(`Question #${qIndex + 1}: Prompt text is required.`);
  }

  const rawOptions = rawQ.options || rawQ.answers || rawQ.choices;
  if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
    throw new Error(`Question #${qIndex + 1} ("${text.slice(0, 30)}..."): At least 2 options are required.`);
  }

  let options = [];
  let detectedCorrect = -1;

  for (let i = 0; i < rawOptions.length; i++) {
    const item = rawOptions[i];
    if (item && typeof item === 'object') {
      const optText = (item.text || item.option || item.answer || item.label || '').toString().trim();
      options.push(optText || `Option ${i + 1}`);
      if (item.isCorrect === true || item.correct === true || item.is_correct === true) {
        detectedCorrect = i;
      }
    } else {
      options.push(String(item != null ? item : '').trim());
    }
  }

  if (options.length > 4) {
    options = options.slice(0, 4);
  }

  let correctIndex = -1;
  if (rawQ.correct_option_index !== undefined && rawQ.correct_option_index !== null) {
    correctIndex = Number(rawQ.correct_option_index);
  } else if (rawQ.correctIndex !== undefined && rawQ.correctIndex !== null) {
    correctIndex = Number(rawQ.correctIndex);
  } else if (detectedCorrect !== -1) {
    correctIndex = detectedCorrect;
  } else if (rawQ.correct !== undefined && rawQ.correct !== null) {
    const c = rawQ.correct;
    if (typeof c === 'number') {
      correctIndex = c;
    } else if (typeof c === 'string') {
      const trimmed = c.trim().toLowerCase();
      if (/^[a-d]$/i.test(trimmed)) {
        correctIndex = trimmed.charCodeAt(0) - 97;
      } else {
        const found = options.findIndex(opt => opt.trim().toLowerCase() === trimmed);
        if (found !== -1) correctIndex = found;
      }
    }
  } else if (rawQ.answer !== undefined || rawQ.correct_answer !== undefined || rawQ.correctAnswer !== undefined) {
    const a = rawQ.answer ?? rawQ.correct_answer ?? rawQ.correctAnswer;
    if (typeof a === 'number') {
      correctIndex = a;
    } else if (typeof a === 'string') {
      const trimmed = a.trim().toLowerCase();
      if (/^[a-d]$/i.test(trimmed)) {
        correctIndex = trimmed.charCodeAt(0) - 97;
      } else {
        const found = options.findIndex(opt => opt.trim().toLowerCase() === trimmed);
        if (found !== -1) correctIndex = found;
      }
    }
  }

  // 1-based index fallback if 1..N was passed
  if (correctIndex >= options.length && correctIndex - 1 < options.length && correctIndex - 1 >= 0) {
    correctIndex = correctIndex - 1;
  }

  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    throw new Error(
      `Question #${qIndex + 1} ("${text.slice(0, 30)}..."): Valid correct option index or answer required (options count: ${options.length}).`
    );
  }

  const timeLimit = Math.max(5, Math.min(300, parseInt(rawQ.time_limit_seconds || rawQ.timeLimit || rawQ.time || 20, 10) || 20));
  const points = Math.max(0, Math.min(10000, parseInt(rawQ.points_value || rawQ.points || rawQ.score || 1000, 10) || 1000));

  return {
    text,
    options,
    correct_option_index: correctIndex,
    time_limit_seconds: timeLimit,
    points_value: points,
  };
}

function normalizeQuizInput(payload) {
  let rawQuizzes = [];

  if (Array.isArray(payload)) {
    if (payload.length > 0 && (payload[0].options || payload[0].answers || payload[0].question || payload[0].text) && !payload[0].questions) {
      rawQuizzes = [{ title: 'Imported Quiz', questions: payload }];
    } else {
      rawQuizzes = payload;
    }
  } else if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.quizzes)) {
      rawQuizzes = payload.quizzes;
    } else if (Array.isArray(payload.questions)) {
      rawQuizzes = [payload];
    } else {
      throw new Error('Invalid JSON format. Expected a quiz object with questions or an array of quizzes.');
    }
  } else {
    throw new Error('Expected JSON object or array.');
  }

  if (rawQuizzes.length === 0) {
    throw new Error('No quizzes found to import.');
  }

  const normalized = [];
  for (let qzIdx = 0; qzIdx < rawQuizzes.length; qzIdx++) {
    const rawQuiz = rawQuizzes[qzIdx];
    if (!rawQuiz || typeof rawQuiz !== 'object') {
      throw new Error(`Quiz #${qzIdx + 1}: Invalid quiz structure.`);
    }

    const title = (rawQuiz.title || rawQuiz.name || `Imported Quiz ${rawQuizzes.length > 1 ? qzIdx + 1 : ''}`).toString().trim() || 'Untitled Imported Quiz';
    const questionsRaw = rawQuiz.questions || rawQuiz.items || [];
    if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
      throw new Error(`Quiz "${title}": Must contain at least 1 question.`);
    }

    const validQuestions = questionsRaw.map((q, idx) => normalizeAndValidateQuestion(q, idx));

    normalized.push({
      title,
      questions: validQuestions,
    });
  }

  return normalized;
}

// Export a quiz as JSON
router.get('/:id/export', (req, res) => {
  const quiz = db.get('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const questions = db
    .all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC', [req.params.id])
    .map(q => ({
      text: q.text,
      options: JSON.parse(q.options_json),
      correct_option_index: q.correct_option_index,
      time_limit_seconds: q.time_limit_seconds,
      points_value: q.points_value,
    }));

  const exportData = {
    title: quiz.title,
    version: '1.0',
    questions,
  };

  const safeFilename = quiz.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'quiz';
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.json"`);
  res.json(exportData);
});

// Import one or multiple quizzes
router.post('/import', (req, res) => {
  try {
    const normalizedQuizzes = normalizeQuizInput(req.body);
    const createdQuizzes = [];

    for (const quizData of normalizedQuizzes) {
      const quizId = uuidv4();
      db.run('INSERT INTO quizzes (id, title) VALUES (?, ?)', [quizId, quizData.title]);

      for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i];
        const qId = uuidv4();
        db.run(
          'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [qId, quizId, q.text, JSON.stringify(q.options), q.correct_option_index, q.time_limit_seconds, q.points_value, i]
        );
      }

      createdQuizzes.push({
        id: quizId,
        title: quizData.title,
        questionCount: quizData.questions.length,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdQuizzes.length} quiz${createdQuizzes.length > 1 ? 'zes' : ''}.`,
      quizzes: createdQuizzes,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to import quiz' });
  }
});

// Import questions into an existing quiz
router.post('/:id/import-questions', (req, res) => {
  try {
    const quiz = db.get('SELECT id, title FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    let rawQuestions = [];
    if (Array.isArray(req.body)) {
      rawQuestions = req.body;
    } else if (req.body && Array.isArray(req.body.questions)) {
      rawQuestions = req.body.questions;
    } else {
      throw new Error('Expected array of questions or { questions: [...] }');
    }

    if (rawQuestions.length === 0) {
      throw new Error('No questions provided in payload.');
    }

    const maxRow = db.get('SELECT COALESCE(MAX(order_index), -1) as m FROM questions WHERE quiz_id = ?', [req.params.id]);
    let currentOrder = maxRow ? maxRow.m : -1;

    const addedQuestions = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = normalizeAndValidateQuestion(rawQuestions[i], i);
      const qId = uuidv4();
      currentOrder++;
      db.run(
        'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [qId, req.params.id, q.text, JSON.stringify(q.options), q.correct_option_index, q.time_limit_seconds, q.points_value, currentOrder]
      );
      addedQuestions.push({
        id: qId,
        quiz_id: req.params.id,
        ...q,
        order_index: currentOrder,
      });
    }

    res.status(201).json({
      success: true,
      message: `Added ${addedQuestions.length} question(s) to "${quiz.title}".`,
      questions: addedQuestions,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to import questions' });
  }
});

// ─── Questions ────────────────────────────────────────────────────────────────

// Add a question
router.post('/:id/questions', (req, res) => {
  const quiz = db.get('SELECT id FROM quizzes WHERE id = ?', [req.params.id]);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { text, options, correct_option_index, time_limit_seconds = 20, points_value = 1000 } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text required' });
  if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'At least 2 options required' });
  if (correct_option_index == null || correct_option_index < 0 || correct_option_index >= options.length)
    return res.status(400).json({ error: 'Valid correct_option_index required' });

  const maxRow = db.get('SELECT COALESCE(MAX(order_index), -1) as m FROM questions WHERE quiz_id = ?', [req.params.id]);
  const maxOrder = maxRow ? maxRow.m : -1;
  const id = uuidv4();

  db.run(
    'INSERT INTO questions (id, quiz_id, text, options_json, correct_option_index, time_limit_seconds, points_value, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.id, text.trim(), JSON.stringify(options), correct_option_index, time_limit_seconds, points_value, maxOrder + 1]
  );

  res.status(201).json({ id, quiz_id: req.params.id, text: text.trim(), options, correct_option_index, time_limit_seconds, points_value });
});

// Edit a question
router.put('/:id/questions/:qid', (req, res) => {
  const existing = db.get('SELECT * FROM questions WHERE id = ? AND quiz_id = ?', [req.params.qid, req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  const { text, options, correct_option_index, time_limit_seconds, points_value } = req.body;
  const newText = text != null ? text.trim() : existing.text;
  const newOptions = options != null ? options : JSON.parse(existing.options_json);
  const newCorrect = correct_option_index != null ? correct_option_index : existing.correct_option_index;
  const newTime = time_limit_seconds != null ? time_limit_seconds : existing.time_limit_seconds;
  const newPoints = points_value != null ? points_value : existing.points_value;

  db.run(
    'UPDATE questions SET text=?, options_json=?, correct_option_index=?, time_limit_seconds=?, points_value=? WHERE id=? AND quiz_id=?',
    [newText, JSON.stringify(newOptions), newCorrect, newTime, newPoints, req.params.qid, req.params.id]
  );

  res.json({ id: req.params.qid, quiz_id: req.params.id, text: newText, options: newOptions, correct_option_index: newCorrect, time_limit_seconds: newTime, points_value: newPoints });
});

// Delete a question
router.delete('/:id/questions/:qid', (req, res) => {
  db.run('DELETE FROM questions WHERE id = ? AND quiz_id = ?', [req.params.qid, req.params.id]);
  res.status(204).send();
});

module.exports = router;
