import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import {
  ANSWER_SHAPES,
  IconCheck,
  IconCross,
  IconClock,
  IconTrophy,
  IconMedal,
  IconArrowUp,
  IconArrowDown,
  IconDash,
} from '../components/Icons';

const ANS_COLORS = ['#FF5A5F', '#2E5EFF', '#FFB800', '#00C48C'];

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};
  const {
    correctOptionIndex,
    personal,
    question,
    pin = sessionStorage.getItem('qa_pin'),
  } = state;

  const [leaderboard, setLeaderboard] = useState(state.leaderboard || []);
  const [isFinal, setIsFinal] = useState(Boolean(state.isLastQuestion));
  const sessionToken =
    sessionStorage.getItem('qa_session_token') ||
    sessionStorage.getItem('qa_sessionToken');

  // Find player's entry
  const myEntry = leaderboard.find((p) => p.sessionToken === sessionToken);
  const myRank = myEntry?.rank || '?';
  const myMovement = myEntry?.movement || 'same';

  useEffect(() => {
    const handleQuestionShow = (nextQuestion) => {
      navigate('/question', { state: { question: nextQuestion, pin } });
    };

    const handleQuizEnded = (data) => {
      setIsFinal(true);
      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    };

    const handleRoomClosed = ({ reason }) => {
      sessionStorage.clear();
      alert(reason || 'Session ended');
      navigate('/join');
    };

    const handleReconnectSuccess = (data) => {
      if (data.phase === 'question-active' && data.question) {
        navigate('/question', { state: { question: data.question, pin } });
      } else if (data.phase === 'ended') {
        setIsFinal(true);
      }
    };

    socket.on('question:show', handleQuestionShow);
    socket.on('quiz:ended', handleQuizEnded);
    socket.on('room:closed', handleRoomClosed);
    socket.on('reconnect:success', handleReconnectSuccess);

    return () => {
      socket.off('question:show', handleQuestionShow);
      socket.off('quiz:ended', handleQuizEnded);
      socket.off('room:closed', handleRoomClosed);
      socket.off('reconnect:success', handleReconnectSuccess);
    };
  }, [navigate, pin]);

  const correctText =
    question?.options && correctOptionIndex !== undefined
      ? question.options[correctOptionIndex]
      : null;

  const CorrectShape =
    correctOptionIndex !== undefined ? ANSWER_SHAPES[correctOptionIndex] : null;

  return (
    <div className="player-page">
      <div className="player-content animate-fade-in" style={{ maxWidth: '480px' }}>
        
        {/* Outcome Verdict Banner */}
        {personal ? (
          <div
            className={`result-banner ${
              personal.answered
                ? personal.correct
                  ? 'correct'
                  : 'incorrect'
                : 'time-up'
            }`}
            style={{ marginBottom: 'var(--sp-5)' }}
          >
            {/* Verdict Icon Circle */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: personal.answered
                  ? personal.correct
                    ? 'rgba(0, 196, 140, 0.2)'
                    : 'rgba(255, 90, 95, 0.2)'
                  : 'rgba(255, 184, 0, 0.2)',
                color: personal.answered
                  ? personal.correct
                    ? 'var(--color-ans-d)'
                    : 'var(--color-ans-a)'
                  : 'var(--color-ans-c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--sp-3)',
              }}
            >
              {personal.answered ? (
                personal.correct ? (
                  <IconCheck size={32} strokeWidth={3} />
                ) : (
                  <IconCross size={32} strokeWidth={3} />
                )
              ) : (
                <IconClock size={32} />
              )}
            </div>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: '800',
                color: 'var(--color-player-text)',
                marginBottom: 'var(--sp-1)',
              }}
            >
              {personal.answered
                ? personal.correct
                  ? 'Correct!'
                  : 'Incorrect'
                : "Time Expired"}
            </h2>

            <p
              className="text-sm font-semibold"
              style={{
                color: personal.answered
                  ? personal.correct
                    ? 'var(--color-ans-d)'
                    : 'var(--color-ans-a)'
                  : 'var(--color-player-text-muted)',
                marginBottom: 'var(--sp-4)',
              }}
            >
              {personal.answered
                ? personal.correct
                  ? `+${personal.pointsEarned} points awarded`
                  : '0 points for this question'
                : 'No answer was submitted in time'}
            </p>

            {/* Rank & Score Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sp-5)',
                background: '#ffffff',
                border: '1px solid rgba(20, 18, 31, 0.1)',
                padding: '8px 24px',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 2px 8px rgba(20, 18, 31, 0.05)',
              }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--color-player-text-muted)' }}>
                  RANK
                </span>
                <span className="font-mono font-bold" style={{ fontSize: '18px', color: 'var(--color-player-text)' }}>
                  #{myRank}
                  <span className={`movement-icon ${myMovement}`} style={{ marginLeft: '4px', verticalAlign: 'middle' }}>
                    {myMovement === 'up' && <IconArrowUp size={12} />}
                    {myMovement === 'down' && <IconArrowDown size={12} />}
                    {myMovement === 'same' && <IconDash size={12} />}
                  </span>
                </span>
              </div>

              <div style={{ width: '1px', height: '26px', background: 'rgba(20, 18, 31, 0.1)' }} />

              <div>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--color-player-text-muted)' }}>
                  TOTAL SCORE
                </span>
                <span className="font-mono font-bold" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                  {personal.totalScore ?? 0}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="player-card text-center" style={{ marginBottom: 'var(--sp-5)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-player-text)' }}>Round Results</h2>
          </div>
        )}

        {/* Correct Answer Reveal */}
        {correctText && (
          <div
            className="player-card"
            style={{
              padding: 'var(--sp-3) var(--sp-4)',
              marginBottom: 'var(--sp-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-3)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: ANS_COLORS[correctOptionIndex] || 'var(--color-ans-d)',
                color: correctOptionIndex === 2 ? '#14121F' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {CorrectShape && <CorrectShape size={18} />}
            </div>

            <div style={{ flex: 1 }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-player-text-muted)' }}>
                Correct Answer
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-player-text)' }}>
                {correctText}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard preview (Top 5 + pinned player row) */}
        <div className="player-card" style={{ padding: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--sp-3)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-player-text-muted)' }}>
              {isFinal ? 'Championship Leaderboard' : 'Current Standings'}
            </h3>
            <span className="text-xs font-mono" style={{ color: 'var(--color-player-text-muted)' }}>
              {leaderboard.length} players
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {leaderboard.slice(0, 5).map((player) => {
              const isMe = player.sessionToken === sessionToken;
              return (
                <div
                  key={player.sessionToken || player.rank}
                  className="flex items-center gap-3"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isMe ? 'rgba(124, 92, 252, 0.1)' : 'var(--color-player-surface-2)',
                    border: isMe ? '1.5px solid var(--color-primary)' : '1px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: 'var(--color-player-text)',
                    }}
                  >
                    {player.rank <= 3 ? <IconMedal rank={player.rank} size={22} /> : `#${player.rank}`}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      fontWeight: isMe ? '700' : '500',
                      fontSize: '14px',
                      color: 'var(--color-player-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.nickname} {isMe && <span className="badge badge-primary text-xs" style={{ padding: '1px 6px', marginLeft: '4px' }}>YOU</span>}
                  </div>

                  <div className={`movement-icon ${player.movement}`} style={{ width: '18px', height: '18px' }}>
                    {player.movement === 'up' && <IconArrowUp size={11} />}
                    {player.movement === 'down' && <IconArrowDown size={11} />}
                    {player.movement === 'same' && <IconDash size={11} />}
                  </div>

                  <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-player-text)' }}>
                    {player.score.toLocaleString()}
                  </div>
                </div>
              );
            })}

            {/* Pinned player row if outside top 5 */}
            {myEntry && myEntry.rank > 5 && (
              <>
                <div className="text-center text-xs text-muted" style={{ margin: '2px 0' }}>• • •</div>
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(124, 92, 252, 0.1)',
                    border: '1.5px solid var(--color-primary)',
                  }}
                >
                  <div className="font-mono font-bold text-sm" style={{ width: '28px', textAlign: 'center', color: 'var(--color-player-text)' }}>
                    #{myEntry.rank}
                  </div>
                  <div style={{ flex: 1, fontWeight: '700', fontSize: '14px', color: 'var(--color-player-text)' }}>
                    {myEntry.nickname} <span className="badge badge-primary text-xs" style={{ padding: '1px 6px', marginLeft: '4px' }}>YOU</span>
                  </div>
                  <div className={`movement-icon ${myEntry.movement}`} style={{ width: '18px', height: '18px' }}>
                    {myEntry.movement === 'up' && <IconArrowUp size={11} />}
                    {myEntry.movement === 'down' && <IconArrowDown size={11} />}
                    {myEntry.movement === 'same' && <IconDash size={11} />}
                  </div>
                  <div className="font-mono font-bold text-sm" style={{ color: 'var(--color-player-text)' }}>
                    {myEntry.score.toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Next Action */}
        {isFinal ? (
          <div className="text-center animate-scale-in">
            <button
              id="player-play-again"
              onClick={() => {
                sessionStorage.clear();
                navigate('/join');
              }}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              Play Another Quiz
            </button>
          </div>
        ) : (
          <div className="player-card text-center" style={{ padding: 'var(--sp-4)' }}>
            <div className="spinner" style={{ margin: '0 auto var(--sp-2)', width: '24px', height: '24px', borderColor: 'rgba(124, 92, 252, 0.2)', borderTopColor: 'var(--color-primary)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--color-player-text-muted)' }}>
              Next question starting shortly…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
