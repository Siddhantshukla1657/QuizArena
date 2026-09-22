import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { IconLogo, IconPlus, IconTrash, IconEdit, IconPlay, IconUpload, IconDownload, IconCheck } from '../components/Icons';
import ImportQuizModal from '../components/ImportQuizModal';

const API = '/api/quizzes';

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [launching, setLaunching] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setQuizzes(data);
    } catch (e) {
      console.error('Failed to fetch quizzes', e);
    } finally {
      setLoading(false);
    }
  }

  async function createQuiz(e) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const quiz = await res.json();
      setNewTitle('');
      setCreating(false);
      navigate(`/build/${quiz.id}`);
    } catch (e) {
      setTitleError('Failed to create quiz. Try again.');
    }
  }

  async function deleteQuiz(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  function exportQuiz(id, title, e) {
    e.stopPropagation();
    window.open(`${API}/${id}/export`, '_blank');
  }

  function launchSession(quizId) {
    setLaunching(quizId);
    socket.emit('room:create', { quizId });
    socket.once('room:created', ({ pin }) => {
      setLaunching(null);
      navigate(`/lobby/${pin}`);
    });
    socket.once('room:error', ({ message }) => {
      setLaunching(null);
      alert('Error: ' + message);
    });
  }

  return (
    <div className="host-page animate-fade-in">
      {/* Success Notification */}
      {notification && (
        <div
          className="card animate-scale-in"
          style={{
            background: 'rgba(0, 196, 140, 0.15)',
            borderColor: 'var(--color-ans-d)',
            padding: '12px 18px',
            marginBottom: 'var(--sp-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-2">
            <IconCheck size={18} strokeWidth={3} />
            <span className="text-sm font-semibold">{notification}</span>
          </div>
          <button
            className="btn btn-ghost btn-sm text-xs"
            onClick={() => setNotification('')}
            style={{ padding: '4px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-10)' }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(124, 92, 252, 0.15)',
              border: '1px solid rgba(124, 92, 252, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconLogo size={26} color="var(--color-primary-light)" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              QuizArena
            </h1>
            <p className="text-xs text-secondary font-medium" style={{ marginTop: '2px' }}>
              Host Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="import-quiz-btn"
            className="btn btn-secondary"
            onClick={() => setImporting(true)}
            title="Import quizzes from JSON file or text"
          >
            <IconUpload size={18} />
            <span>Import JSON</span>
          </button>

          <button
            id="create-quiz-btn"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={18} />
            <span>Create Quiz</span>
          </button>
        </div>
      </header>

      {/* Create Quiz Modal */}
      {creating && (
        <div className="dialog-overlay" onClick={() => setCreating(false)}>
          <div className="dialog-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-2)' }}>
              Create New Quiz
            </h2>
            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--sp-6)' }}>
              Enter a descriptive name for your quiz session.
            </p>
            <form onSubmit={createQuiz} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted font-bold uppercase tracking-wider block" style={{ marginBottom: 'var(--sp-2)' }} htmlFor="quiz-title">
                  Quiz Title
                </label>
                <input
                  id="quiz-title"
                  className="input"
                  placeholder="e.g. Science & Tech Trivia 2026"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setTitleError('');
                  }}
                  autoFocus
                />
                {titleError && (
                  <span className="text-xs text-coral font-medium" style={{ display: 'block', marginTop: '6px' }}>
                    {titleError}
                  </span>
                )}
              </div>
              <div className="flex gap-3 justify-end" style={{ marginTop: 'var(--sp-4)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Add Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-6)' }}>
          <h2 className="text-xl font-bold">Quiz Library</h2>
          <span className="badge badge-primary font-mono">{quizzes.length} Quizzes</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center" style={{ padding: 'var(--sp-16)' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="card text-center" style={{ padding: 'var(--sp-12)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto var(--sp-4)',
                borderRadius: '50%',
                background: 'rgba(124, 92, 252, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <IconLogo size={32} />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: 'var(--sp-2)' }}>No quizzes authored yet</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--sp-6)', maxWidth: '360px', marginInline: 'auto' }}>
              Author your first live multiple-choice quiz with customizable timers and speed scoring.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <IconPlus size={18} />
                <span>Create Your First Quiz</span>
              </button>
              <button
                id="empty-import-quiz-btn"
                className="btn btn-secondary"
                onClick={() => setImporting(true)}
              >
                <IconUpload size={18} />
                <span>Import Quiz (JSON)</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--sp-5)' }}>
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="card"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate(`/build/${quiz.id}`)}
            >
              <div className="flex items-start justify-between gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
                <h3 className="text-lg font-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {quiz.title}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    id={`export-quiz-${quiz.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => exportQuiz(quiz.id, quiz.title, e)}
                    style={{ color: 'var(--color-text-secondary)', padding: '6px' }}
                    title="Export quiz as JSON"
                  >
                    <IconDownload size={16} />
                  </button>
                  <button
                    id={`delete-quiz-${quiz.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => deleteQuiz(quiz.id, e)}
                    style={{ color: 'var(--color-ans-a)', padding: '6px' }}
                    title="Delete quiz"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
                <span className="badge badge-primary font-mono text-xs">
                  {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
                </span>
              </div>

              <div className="flex gap-2" style={{ marginTop: 'auto' }}>
                <button
                  id={`edit-quiz-${quiz.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/build/${quiz.id}`);
                  }}
                >
                  <IconEdit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  id={`launch-quiz-${quiz.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={quiz.questionCount === 0 || launching === quiz.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    launchSession(quiz.id);
                  }}
                >
                  <IconPlay size={16} />
                  <span>{launching === quiz.id ? 'Launching…' : 'Launch'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Import Quiz Modal */}
      <ImportQuizModal
        isOpen={importing}
        onClose={() => setImporting(false)}
        onSuccess={(result) => {
          fetchQuizzes();
          setNotification(result.message || 'Quizzes successfully imported!');
          setTimeout(() => setNotification(''), 6000);
        }}
      />
    </div>
  );
}
