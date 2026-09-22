import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import {
  ANSWER_SHAPES,
  IconPause,
  IconPlay,
  IconSkip,
  IconEnd,
  IconSignal,
  IconClock,
  IconCheck,
} from '../components/Icons';

const ANS_CLASSES = ['ans-a', 'ans-b', 'ans-c', 'ans-d'];

export default function LiveQuestion() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(location.state?.question || null);
  const [timeLeft, setTimeLeft] = useState(question?.timeLimitSeconds || 0);
  const [answered, setAnswered] = useState(0);
  const [total, setTotal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const timerRef = useRef(null);

  // Set up socket listeners
  useEffect(() => {
    socket.on('question:show', (data) => {
      setQuestion(data);
      setTimeLeft(data.timeLimitSeconds);
      setAnswered(0);
      setTotal(0);
      setPaused(false);
    });

    socket.on('answer:count', ({ answered: ansCount, total: totalCount }) => {
      setAnswered(ansCount);
      setTotal(totalCount);
    });

    socket.on('question:results', (data) => {
      navigate(`/results/${pin}`, { state: { results: data } });
    });

    socket.on('quiz:paused', () => setPaused(true));
    socket.on('quiz:resumed', () => setPaused(false));
    socket.on('quiz:ended', (data) =>
      navigate(`/results/${pin}`, { state: { results: data, final: true } })
    );

    return () => {
      socket.off('question:show');
      socket.off('answer:count');
      socket.off('question:results');
      socket.off('quiz:paused');
      socket.off('quiz:resumed');
      socket.off('quiz:ended');
    };
  }, [pin, navigate]);

  // Client-side countdown
  useEffect(() => {
    if (!question) return;
    setTimeLeft(question.timeLimitSeconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [question?.questionIndex, paused]);

  function control(action) {
    if (action === 'end') {
      setShowEndConfirm(true);
      return;
    }
    socket.emit('host:control', { pin, action });
  }

  function confirmEnd() {
    socket.emit('host:control', { pin, action: 'end' });
    setShowEndConfirm(false);
  }

  if (!question) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  const totalTime = question.timeLimitSeconds || 20;
  const pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const urgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: 'var(--sp-6)',
      }}
    >
      {/* ── STAGE AREA (Rows 1–8 per design concept) ────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Row 1: Header metadata & PIN */}
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="flex items-center gap-3">
            <span className="badge badge-primary font-mono text-sm">
              Question {(question.questionIndex ?? 0) + 1} of {question.totalQuestions}
            </span>
            <span className="badge font-mono text-xs" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              Room {pin}
            </span>
          </div>

          {/* Countdown display */}
          <div className="flex items-center gap-2">
            <IconClock size={18} className={urgent ? 'text-coral' : 'text-primary'} />
            <span
              className={`font-mono font-bold ${urgent ? 'text-coral' : 'text-primary'}`}
              style={{ fontSize: '24px', minWidth: '40px', textAlign: 'right' }}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="countdown-wrap" style={{ height: '8px', marginBottom: 'var(--sp-6)' }}>
          <div
            className={`countdown-bar ${urgent ? 'urgent' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Pause Banner */}
        {paused && (
          <div
            className="card animate-scale-in text-center"
            style={{
              padding: 'var(--sp-3)',
              background: 'rgba(255, 184, 0, 0.12)',
              borderColor: 'var(--color-warning)',
              marginBottom: 'var(--sp-5)',
            }}
          >
            <strong style={{ color: 'var(--color-warning)' }}>Session Paused by Host</strong>
          </div>
        )}

        {/* Question Prompt Stage */}
        <div
          className="card text-center"
          style={{
            padding: 'var(--sp-8) var(--sp-6)',
            marginBottom: 'var(--sp-6)',
            minHeight: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface-2)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '700',
              lineHeight: '1.3',
              maxWidth: '860px',
              wordBreak: 'break-word',
            }}
          >
            {question.text}
          </h2>
        </div>

        {/* 4 Answer Blocks */}
        <div className="answers-grid" style={{ marginBottom: 'var(--sp-6)' }}>
          {question.options.map((opt, i) => {
            const Shape = ANSWER_SHAPES[i];
            return (
              <div
                key={i}
                className={`answer-tile ${ANS_CLASSES[i]}`}
                style={{
                  minHeight: '84px',
                  padding: 'var(--sp-4) var(--sp-5)',
                  cursor: 'default',
                }}
              >
                <div className="ans-shape-badge">
                  <Shape size={20} />
                </div>
                <span style={{ flex: 1, fontSize: '18px', fontWeight: '600' }}>
                  {opt}
                </span>
              </div>
            );
          })}
        </div>

        {/* Row 8: Live Answer Counter */}
        <div className="flex justify-center" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="live-counter-pill">
            <IconSignal size={18} color="var(--color-live)" />
            <span>
              {answered} of {total || 0} answered
            </span>
          </div>
        </div>
      </div>

      {/* ── DOCKED HOST CONTROLS (Rows 9–10 per design concept) ──────────── */}
      <div
        className="host-dock"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--sp-4)',
        }}
      >
        <div className="flex items-center gap-3">
          {paused ? (
            <button
              id="resume-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => control('resume')}
            >
              <IconPlay size={16} />
              <span>Resume</span>
            </button>
          ) : (
            <button
              id="pause-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => control('pause')}
            >
              <IconPause size={16} />
              <span>Pause</span>
            </button>
          )}

          <div className="flex items-center gap-2" style={{ marginLeft: 'var(--sp-2)' }}>
            <IconSignal size={16} color="var(--color-live)" />
            <span className="text-xs text-muted font-mono">LAN Live Sync</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="skip-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => control('skip')}
          >
            <IconSkip size={16} />
            <span>Skip Question</span>
          </button>
          <button
            id="end-btn"
            className="btn btn-danger btn-sm"
            onClick={() => control('end')}
          >
            <IconEnd size={16} />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for End Session */}
      {showEndConfirm && (
        <div className="dialog-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="dialog-modal text-center" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 90, 95, 0.15)',
                color: 'var(--color-ans-a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--sp-4)',
              }}
            >
              <IconEnd size={28} />
            </div>
            <h3 className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-2)' }}>
              End Quiz Session?
            </h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--sp-6)' }}>
              This action is irreversible. The live session will conclude immediately and final scores will be tallied.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmEnd}
              >
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
