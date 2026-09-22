import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import { ANSWER_SHAPES, IconClock, IconCheck } from '../components/Icons';

const ANS_CLASSES = ['ans-a', 'ans-b', 'ans-c', 'ans-d'];

export default function Question() {
  const navigate = useNavigate();
  const location = useLocation();

  const [question, setQuestion] = useState(location.state?.question || null);
  const [pin] = useState(
    location.state?.pin || sessionStorage.getItem('qa_pin') || ''
  );
  const sessionToken =
    sessionStorage.getItem('qa_session_token') ||
    sessionStorage.getItem('qa_sessionToken') ||
    '';

  const [selectedIndex, setSelectedIndex] = useState(
    location.state?.question?.alreadyAnswered
      ? (location.state.question.answeredOptionIdx ?? null)
      : null
  );
  const [isLocked, setIsLocked] = useState(
    Boolean(location.state?.question?.alreadyAnswered)
  );
  const [feedback, setFeedback] = useState(
    location.state?.question?.alreadyAnswered ? 'Answer locked in' : ''
  );
  const [isPaused, setIsPaused] = useState(false);

  // Time remaining
  const initialTime = question?.remainingMs
    ? Math.max(0, Math.ceil(question.remainingMs / 1000))
    : question?.timeLimitSeconds || 20;

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerRef = useRef(null);

  // Auto reconnect if reloaded
  useEffect(() => {
    if (!question && pin && sessionToken) {
      socket.emit('player:reconnect', { pin, sessionToken });
    }
  }, [question, pin, sessionToken]);

  // Socket event listeners
  useEffect(() => {
    const handleQuestionShow = (data) => {
      setQuestion(data);
      setTimeLeft(data.timeLimitSeconds || 20);
      setSelectedIndex(null);
      setIsLocked(false);
      setFeedback('');
      setIsPaused(false);
    };

    const handleAnswerAck = ({ accepted, reason }) => {
      if (accepted) {
        setFeedback('Answer locked in');
      } else {
        setIsLocked(true);
        if (reason === 'time_up') {
          setFeedback("Time expired");
        } else {
          setFeedback('Submission recorded');
        }
      }
    };

    const handleQuestionResults = (data) => {
      navigate('/result', {
        state: {
          ...data,
          question,
          pin,
        },
      });
    };

    const handleQuizPaused = () => setIsPaused(true);
    const handleQuizResumed = () => setIsPaused(false);

    const handleReconnectSuccess = (data) => {
      if (data.question) {
        setQuestion(data.question);
        const rem = data.question.remainingMs
          ? Math.max(0, Math.ceil(data.question.remainingMs / 1000))
          : data.question.timeLimitSeconds;
        setTimeLeft(rem);
        if (data.question.alreadyAnswered) {
          setSelectedIndex(data.question.answeredOptionIdx ?? null);
          setIsLocked(true);
          setFeedback('Answer locked in');
        }
      } else if (data.phase === 'lobby') {
        navigate('/waiting', { state: { pin } });
      }
    };

    const handleReconnectError = ({ message }) => {
      sessionStorage.clear();
      alert(message || 'Session expired');
      navigate('/join');
    };

    const handleRoomClosed = ({ reason }) => {
      sessionStorage.clear();
      alert(reason || 'Quiz session ended');
      navigate('/join');
    };

    socket.on('question:show', handleQuestionShow);
    socket.on('answer:ack', handleAnswerAck);
    socket.on('question:results', handleQuestionResults);
    socket.on('quiz:paused', handleQuizPaused);
    socket.on('quiz:resumed', handleQuizResumed);
    socket.on('reconnect:success', handleReconnectSuccess);
    socket.on('reconnect:error', handleReconnectError);
    socket.on('room:closed', handleRoomClosed);

    return () => {
      socket.off('question:show', handleQuestionShow);
      socket.off('answer:ack', handleAnswerAck);
      socket.off('question:results', handleQuestionResults);
      socket.off('quiz:paused', handleQuizPaused);
      socket.off('quiz:resumed', handleQuizResumed);
      socket.off('reconnect:success', handleReconnectSuccess);
      socket.off('reconnect:error', handleReconnectError);
      socket.off('room:closed', handleRoomClosed);
    };
  }, [navigate, question, pin]);

  // Visual countdown timer
  useEffect(() => {
    if (!question || isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, isPaused]);

  const handleSelectOption = (idx) => {
    if (isLocked || timeLeft === 0 || isPaused) return;

    setSelectedIndex(idx);
    setIsLocked(true);
    setFeedback('Sending…');

    socket.emit('answer:submit', {
      pin,
      sessionToken,
      optionIdx: idx,
    });
  };

  if (!question) {
    return (
      <div className="player-page justify-center items-center">
        <div className="spinner" style={{ borderColor: 'rgba(124, 92, 252, 0.2)', borderTopColor: 'var(--color-primary)' }} />
        <p style={{ marginTop: 'var(--sp-4)', color: 'var(--color-player-text-muted)', fontSize: '14px' }}>
          Syncing with server…
        </p>
      </div>
    );
  }

  const totalTime = question.timeLimitSeconds || 20;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="player-page">
      <div className="player-content animate-fade-in" style={{ maxWidth: '480px' }}>
        
        {/* Status Row: Countdown and Question counter per design spec */}
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-3)' }}>
          <div className="flex items-center gap-2">
            <IconClock size={18} className={isUrgent ? 'text-coral' : undefined} style={{ color: isUrgent ? 'var(--color-ans-a)' : 'var(--color-primary)' }} />
            <span
              className={`font-mono font-bold ${isUrgent ? 'text-coral' : ''}`}
              style={{ fontSize: '20px', minWidth: '34px' }}
            >
              {timeLeft}s
            </span>
          </div>

          <span
            className="font-mono text-xs font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(20, 18, 31, 0.08)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-player-text)',
            }}
          >
            Q{(question.questionIndex ?? 0) + 1} of {question.totalQuestions}
          </span>
        </div>

        {/* Shrinking Countdown Progress Bar */}
        <div className="player-countdown-wrap" style={{ height: '8px', marginBottom: 'var(--sp-5)' }}>
          <div
            className={`countdown-bar ${isUrgent ? 'urgent' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Paused alert */}
        {isPaused && (
          <div
            className="player-card text-center"
            style={{
              background: 'rgba(255, 184, 0, 0.12)',
              borderColor: 'var(--color-ans-c)',
              padding: 'var(--sp-3)',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <strong style={{ color: '#9C6F00', fontSize: '14px' }}>Session Paused by Host</strong>
          </div>
        )}

        {/* Question Prompt */}
        <div
          className="player-card"
          style={{
            padding: 'var(--sp-6)',
            marginBottom: 'var(--sp-5)',
            textAlign: 'center',
            minHeight: '110px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '21px',
              fontWeight: '700',
              lineHeight: '1.3',
              color: 'var(--color-player-text)',
              wordBreak: 'break-word',
            }}
          >
            {question.text}
          </h2>
        </div>

        {/* 4 Answer Tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          {question.options.map((optText, idx) => {
            const Shape = ANSWER_SHAPES[idx];
            const isSelected = selectedIndex === idx;
            const disabled = isLocked || timeLeft === 0 || isPaused;

            let extraClasses = '';
            if (isSelected) extraClasses += ' selected';
            if (disabled && !isSelected) extraClasses += ' disabled';

            return (
              <button
                key={idx}
                type="button"
                id={`player-option-${idx}`}
                onClick={() => handleSelectOption(idx)}
                disabled={disabled}
                className={`answer-tile ${ANS_CLASSES[idx]} ${extraClasses}`}
                style={{
                  minHeight: '68px',
                }}
              >
                <div className="ans-shape-badge">
                  <Shape size={20} />
                </div>
                <span style={{ flex: 1, fontSize: '17px', fontWeight: '600' }}>
                  {optText}
                </span>

                {isSelected && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: idx === 2 ? '#14121F' : 'var(--color-ans-d)',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconCheck size={16} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lock / Response Feedback Banner */}
        {isLocked && (
          <div
            className="player-card text-center animate-fade-in"
            style={{
              padding: 'var(--sp-3)',
              background: selectedIndex !== null ? 'rgba(124, 92, 252, 0.08)' : 'rgba(255, 90, 95, 0.08)',
              borderColor: selectedIndex !== null ? 'var(--color-primary)' : 'var(--color-ans-a)',
            }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: selectedIndex !== null ? 'var(--color-primary)' : 'var(--color-ans-a)' }}
            >
              {feedback || 'Answer recorded. Awaiting results…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
