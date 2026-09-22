import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket';
import { IconLogo, IconCheck } from '../components/Icons';

export default function Waiting() {
  const navigate = useNavigate();
  const location = useLocation();
  const nickname =
    location.state?.nickname || sessionStorage.getItem('qa_nickname') || 'Player';
  const pin = location.state?.pin || sessionStorage.getItem('qa_pin');

  useEffect(() => {
    socket.on('question:show', (data) => {
      navigate('/question', { state: { question: data, pin } });
    });

    socket.on('room:closed', ({ reason }) => {
      sessionStorage.clear();
      navigate('/join');
      alert(reason || 'Room closed by host');
    });

    return () => {
      socket.off('question:show');
      socket.off('room:closed');
    };
  }, [navigate, pin]);

  return (
    <div className="player-page justify-center items-center">
      <div className="player-content text-center animate-fade-in" style={{ maxWidth: '420px' }}>
        
        {/* Brand */}
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
          <IconLogo size={24} color="var(--color-primary)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '800', color: 'var(--color-player-text)' }}>
            QuizArena
          </span>
        </div>

        {/* Personalized Avatar */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            margin: '0 auto var(--sp-5)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: '800',
            fontFamily: 'var(--font-display)',
            color: '#ffffff',
            boxShadow: '0 8px 32px var(--color-primary-glow)',
          }}
        >
          {nickname.charAt(0).toUpperCase()}
        </div>

        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 'var(--sp-1)' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-player-text)' }}>
            You're in!
          </h2>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--color-ans-d)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={14} strokeWidth={3} />
          </span>
        </div>

        <p style={{ color: 'var(--color-player-text-muted)', fontSize: '15px', marginBottom: 'var(--sp-8)' }}>
          Playing as <strong style={{ color: 'var(--color-player-text)' }}>{nickname}</strong>
        </p>

        {/* Waiting Card */}
        <div className="player-card" style={{ padding: 'var(--sp-8)' }}>
          <div className="spinner" style={{ margin: '0 auto var(--sp-4)', borderColor: 'rgba(124, 92, 252, 0.2)', borderTopColor: 'var(--color-primary)' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--color-player-text)', marginBottom: 'var(--sp-1)' }}>
            Waiting for Host to Start
          </p>
          <p className="text-xs" style={{ color: 'var(--color-player-text-muted)' }}>
            Keep this screen open. The first question will pop up automatically.
          </p>
        </div>

        <p className="text-xs font-mono" style={{ color: 'var(--color-player-text-muted)', marginTop: 'var(--sp-6)' }}>
          ROOM PIN: <strong style={{ color: 'var(--color-player-text)' }}>{pin}</strong>
        </p>
      </div>
    </div>
  );
}
