import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ANSWER_SHAPES,
  IconCheck,
  IconPlus,
  IconTrash,
  IconEdit,
  IconClock,
  IconSparkle,
  IconUpload,
  IconDownload,
} from '../components/Icons';
import ImportQuizModal from '../components/ImportQuizModal';

const API = '/api/quizzes';
const DEFAULT_OPTIONS = ['', '', '', ''];
const ANS_CLASSES = ['ans-a', 'ans-b', 'ans-c', 'ans-d'];

function QuestionForm({ question, onSave, onCancel, saving }) {
  const [text, setText] = useState(question?.text || '');
  const [options, setOptions] = useState(
    question?.options?.length ? [...question.options] : [...DEFAULT_OPTIONS]
  );
  const [correct, setCorrect] = useState(question?.correct_option_index ?? 0);
  const [timeLimit, setTimeLimit] = useState(question?.time_limit_seconds ?? 20);
  const [points, setPoints] = useState(question?.points_value ?? 1000);
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!text.trim()) errs.text = 'Question prompt text is required';
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) errs.options = 'At least 2 options must be specified';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const filledOptions = options.map((o) => o.trim() || '(empty)');
    onSave({
      text: text.trim(),
      options: filledOptions,
      correct_option_index: correct,
      time_limit_seconds: timeLimit,
      points_value: points,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-scale-in" style={{ marginBottom: 'var(--sp-6)', borderColor: 'var(--color-primary)' }}>
      <h3 className="text-lg font-bold" style={{ marginBottom: 'var(--sp-4)' }}>
        {question ? 'Edit Question' : 'Author New Question'}
      </h3>

      {/* Question Prompt */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <label className="text-xs text-muted font-bold uppercase tracking-wider block" style={{ marginBottom: 'var(--sp-2)' }} htmlFor="q-text">
          Question Text
        </label>
        <input
          id="q-text"
          className="input"
          placeholder="e.g. Which layer of the atmosphere contains the ozone layer?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {errors.text && (
          <span className="text-xs text-coral font-medium" style={{ display: 'block', marginTop: '6px' }}>
            {errors.text}
          </span>
        )}
      </div>

      {/* Answer Options Grid */}
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-2)' }}>
          <label className="text-xs text-muted font-bold uppercase tracking-wider">
            Answer Options & Correct Key (Click shape to mark correct)
          </label>
        </div>
        {errors.options && (
          <span className="text-xs text-coral font-medium" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
            {errors.options}
          </span>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
          {options.map((opt, i) => {
            const Shape = ANSWER_SHAPES[i];
            const isCorrect = correct === i;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <button
                  type="button"
                  id={`correct-${i}`}
                  onClick={() => setCorrect(i)}
                  title={isCorrect ? 'Correct option' : 'Mark as correct option'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    border: isCorrect
                      ? '2px solid var(--color-ans-d)'
                      : '1.5px solid var(--color-border-strong)',
                    background: isCorrect
                      ? 'var(--color-ans-d)'
                      : 'var(--color-surface-2)',
                    color: isCorrect ? '#ffffff' : 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  {isCorrect ? <IconCheck size={18} strokeWidth={3} /> : <Shape size={18} />}
                </button>
                <input
                  id={`option-${i}`}
                  className="input"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={(e) => {
                    const n = [...options];
                    n[i] = e.target.value;
                    setOptions(n);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Timing and Points Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div>
          <label className="text-xs text-muted font-bold uppercase tracking-wider block" style={{ marginBottom: 'var(--sp-2)' }} htmlFor="time-limit">
            Time Limit (Seconds)
          </label>
          <select
            id="time-limit"
            className="input font-mono"
            value={timeLimit}
            onChange={(e) => setTimeLimit(+e.target.value)}
          >
            {[10, 15, 20, 30, 45, 60, 90].map((t) => (
              <option key={t} value={t}>
                {t} seconds
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted font-bold uppercase tracking-wider block" style={{ marginBottom: 'var(--sp-2)' }} htmlFor="points-val">
            Base Points
          </label>
          <select
            id="points-val"
            className="input font-mono"
            value={points}
            onChange={(e) => setPoints(+e.target.value)}
          >
            {[500, 1000, 1500, 2000].map((p) => (
              <option key={p} value={p}>
                {p} pts
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : question ? 'Update Question' : 'Save Question'}
        </button>
      </div>
    </form>
  );
}

export default function QuizBuilder() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  async function fetchQuiz() {
    const res = await fetch(`/api/quizzes/${quizId}`);
    if (!res.ok) {
      navigate('/');
      return;
    }
    const data = await res.json();
    setQuiz(data);
    setTitleDraft(data.title);
    setLoading(false);
  }

  async function saveTitle() {
    if (!titleDraft.trim()) return;
    await fetch(`/api/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleDraft }),
    });
    setQuiz((q) => ({ ...q, title: titleDraft }));
    setEditingTitle(false);
  }

  async function addQuestion(data) {
    setSaving(true);
    const res = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const q = await res.json();
    setQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...q, options: data.options }],
    }));
    setShowAddForm(false);
    setSaving(false);
  }

  async function updateQuestion(qid, data) {
    setSaving(true);
    const res = await fetch(`/api/quizzes/${quizId}/questions/${qid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid ? { ...q, ...updated, options: data.options } : q
      ),
    }));
    setEditingQuestion(null);
    setSaving(false);
  }

  async function deleteQuestion(qid) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/quizzes/${quizId}/questions/${qid}`, { method: 'DELETE' });
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== qid),
    }));
  }

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="host-page animate-fade-in">
      {/* Top Header */}
      <header className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-6)' }}>
        <button
          id="back-to-dashboard"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/')}
        >
          ← Return to Dashboard
        </button>

        <div className="flex items-center gap-3">
          {editingTitle ? (
            <input
              id="quiz-title-edit"
              className="input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              autoFocus
              style={{ maxWidth: '360px' }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: '24px', fontWeight: '800' }}>{quiz.title}</h1>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingTitle(true)}
                title="Edit title"
              >
                <IconEdit size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-quiz-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => window.open(`/api/quizzes/${quizId}/export`, '_blank')}
            title="Export quiz as JSON"
          >
            <IconDownload size={16} />
            <span>Export</span>
          </button>
          <button
            id="import-questions-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => setImporting(true)}
            title="Import questions from JSON"
          >
            <IconUpload size={16} />
            <span>Import Questions</span>
          </button>
          <button
            id="add-question-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(true)}
          >
            <IconPlus size={16} />
            <span>Add Question</span>
          </button>
        </div>
      </header>

      {/* Inline New Question Form */}
      {showAddForm && (
        <QuestionForm
          onSave={addQuestion}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
        />
      )}

      {/* Questions List */}
      <main>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
            Questions ({quiz.questions?.length || 0})
          </h2>
        </div>

        {(!quiz.questions || quiz.questions.length === 0) && !showAddForm && (
          <div className="card text-center" style={{ padding: 'var(--sp-12)' }}>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
              This quiz has no questions yet. Click Add Question to author one.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                <IconPlus size={16} />
                <span>Add First Question</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setImporting(true)}>
                <IconUpload size={16} />
                <span>Import from JSON</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {quiz.questions?.map((q, idx) => {
            const isEditing = editingQuestion?.id === q.id;
            if (isEditing) {
              return (
                <QuestionForm
                  key={q.id}
                  question={q}
                  onSave={(data) => updateQuestion(q.id, data)}
                  onCancel={() => setEditingQuestion(null)}
                  saving={saving}
                />
              );
            }

            return (
              <div key={q.id} className="card" style={{ padding: 'var(--sp-5)' }}>
                <div className="flex items-start justify-between gap-4" style={{ marginBottom: 'var(--sp-4)' }}>
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <h3 className="text-base font-bold" style={{ lineHeight: '1.3' }}>
                      {q.text}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingQuestion(q)}
                      title="Edit question"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteQuestion(q.id)}
                      style={{ color: 'var(--color-ans-a)' }}
                      title="Delete question"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>

                {/* Options preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  {q.options?.map((opt, i) => {
                    const Shape = ANSWER_SHAPES[i];
                    const isCorrect = i === q.correct_option_index;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: isCorrect ? 'rgba(0, 196, 140, 0.12)' : 'var(--color-surface-2)',
                          border: isCorrect ? '1px solid var(--color-ans-d)' : '1px solid var(--color-border)',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ color: `var(--color-${ANS_CLASSES[i]})`, display: 'flex', alignItems: 'center' }}>
                          <Shape size={14} />
                        </span>
                        <span style={{ flex: 1, fontWeight: isCorrect ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt}
                        </span>
                        {isCorrect && (
                          <span style={{ color: 'var(--color-ans-d)', display: 'flex', alignItems: 'center' }}>
                            <IconCheck size={14} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-3">
                  <span className="badge badge-primary text-xs font-mono">
                    <IconClock size={12} /> {q.time_limit_seconds}s
                  </span>
                  <span className="badge badge-primary text-xs font-mono">
                    <IconSparkle size={12} /> {q.points_value} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Import Questions Modal */}
      <ImportQuizModal
        isOpen={importing}
        onClose={() => setImporting(false)}
        targetQuizId={quizId}
        targetQuizTitle={quiz?.title || ''}
        onSuccess={() => fetchQuiz()}
      />
    </div>
  );
}
