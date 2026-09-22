import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import {
  IconTrophy,
  IconMedal,
  IconArrowUp,
  IconArrowDown,
  IconDash,
  IconCheck,
  IconPlay,
} from '../components/Icons';

export default function Leaderboard() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [results, setResults] = useState(location.state?.results || null);
  const [isFinal, setIsFinal] = useState(location.state?.final || false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    socket.on('question:results', (data) => {
      setResults(data);
      setIsFinal(false);
      setAdvancing(false);
    });
    socket.on('quiz:ended', (data) => {
      setResults(data);
      setIsFinal(true);
    });

    return () => {
      socket.off('question:results');
      socket.off('quiz:ended');
    };
  }, []);

  function nextQuestion() {
    setAdvancing(true);
    socket.emit('host:control', { pin, action: 'next' });
    socket.once('question:show', (data) => {
      navigate(`/live/${pin}`, { state: { question: data } });
    });
  }

  function viewFinal() {
    socket.emit('host:control', { pin, action: 'next' });
  }

  if (!results) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  const leaderboard = results.leaderboard || [];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--sp-8) var(--sp-6)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '680px' }}>
        
        {/* Stage Header */}
        <div className="text-center animate-fade-in" style={{ marginBottom: 'var(--sp-6)' }}>
          {isFinal ? (
            <>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--sp-3)',
                }}
              >
                <IconTrophy size={36} color="#FFD700" />
              </div>
              <h1 className="text-3xl font-extrabold" style={{ marginBottom: 'var(--sp-2)' }}>
                Final Championship Standings
              </h1>
              <p className="text-secondary text-sm">
                Session complete. Top participants ranked by accuracy and speed.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold" style={{ marginBottom: 'var(--sp-2)' }}>
                Round Standings
              </h1>
              {results.correctOptionIndex !== undefined && (
                <div
                  className="badge badge-emerald"
                  style={{
                    display: 'inline-flex',
                    padding: '6px 14px',
                    fontSize: '13px',
                    marginTop: 'var(--sp-1)',
                  }}
                >
                  <IconCheck size={14} strokeWidth={3} />
                  <span>
                    Correct Option: {String.fromCharCode(65 + results.correctOptionIndex)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Leaderboard Rows */}
        <div className="leaderboard-container" style={{ marginBottom: 'var(--sp-8)' }}>
          {leaderboard.map((entry, idx) => {
            const isTop1 = entry.rank === 1;
            const isTop2 = entry.rank === 2;
            const isTop3 = entry.rank === 3;
            let rankClass = '';
            if (isTop1) rankClass = 'rank-first';
            else if (isTop2) rankClass = 'rank-second';
            else if (isTop3) rankClass = 'rank-third';

            return (
              <div
                key={entry.sessionToken || entry.nickname}
                className={`leaderboard-row ${rankClass} animate-fade-in`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Rank Badge */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {entry.rank <= 3 ? (
                    <IconMedal rank={entry.rank} size={28} />
                  ) : (
                    <span className="text-muted text-sm font-bold">#{entry.rank}</span>
                  )}
                </div>

                {/* Nickname */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    className="font-semibold text-base"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {entry.nickname}
                  </div>
                </div>

                {/* Rank Movement Indicator */}
                <div className={`movement-icon ${entry.movement}`}>
                  {entry.movement === 'up' && <IconArrowUp size={14} />}
                  {entry.movement === 'down' && <IconArrowDown size={14} />}
                  {entry.movement === 'same' && <IconDash size={14} />}
                </div>

                {/* Tabular Score */}
                <div className="text-right font-mono">
                  <span style={{ fontWeight: '800', fontSize: '18px', color: '#ffffff' }}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted" style={{ marginLeft: '4px' }}>pts</span>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="card text-center text-secondary" style={{ padding: 'var(--sp-8)' }}>
              No participants have submitted answers yet.
            </div>
          )}
        </div>

        {/* Action Controls */}
        {!isFinal ? (
          <div className="flex gap-4 justify-center">
            <button
              id="next-question-btn"
              className="btn btn-primary btn-lg"
              disabled={advancing}
              onClick={nextQuestion}
              style={{ minWidth: '220px' }}
            >
              <IconPlay size={18} />
              <span>{advancing ? 'Loading Question…' : 'Next Question'}</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <button
              id="finish-session-btn"
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/')}
              style={{ minWidth: '220px' }}
            >
              Finish & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
