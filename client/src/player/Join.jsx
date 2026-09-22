import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { IconLogo, IconPlay } from '../components/Icons';

export default function Join() {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Restore session on page load to attempt reconnect
    const savedToken =
      sessionStorage.getItem('qa_session_token') ||
      sessionStorage.getItem('qa_sessionToken');
    const savedPin = sessionStorage.getItem('qa_pin');
    const savedNick = sessionStorage.getItem('qa_nickname');

    if (savedToken && savedPin && savedNick) {
      socket.emit('player:reconnect', {
        pin: savedPin,
        sessionToken: savedToken,
        nickname: savedNick,
      });
      socket.once('reconnect:success', (data) => {
        handleStateSync(data, savedPin, savedNick);
      });
      socket.once('reconnect:error', () => {
        sessionStorage.clear();
      });
    }

    socket.on('room:join:success', ({ sessionToken, nickname: nick, pin: p }) => {
      sessionStorage.setItem('qa_session_token', sessionToken);
      sessionStorage.setItem('qa_sessionToken', sessionToken);
      sessionStorage.setItem('qa_pin', p);
      sessionStorage.setItem('qa_nickname', nick);
      setLoading(false);
      navigate('/waiting', { state: { nickname: nick, pin: p } });
    });

    socket.on('room:join:error', ({ message }) => {
      setLoading(false);
      if (message.includes('PIN') || message.includes('active')) {
        setErrors((e) => ({ ...e, pin: message }));
      } else if (message.includes('Nickname') || message.includes('nickname')) {
        setErrors((e) => ({ ...e, nickname: message }));
      } else {
        setErrors((e) => ({ ...e, general: message }));
      }
    });

    return () => {
      socket.off('room:join:success');
      socket.off('room:join:error');
      socket.off('reconnect:success');
      socket.off('reconnect:error');
    };
  }, [navigate]);

  function handleStateSync(data, savedPin, savedNick) {
    navigate('/waiting', {
      state: { nickname: savedNick, pin: savedPin, phase: data.phase },
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    const errs = {};
    if (!pin.trim()) errs.pin = 'Please enter the 6-digit room PIN';
    if (!nickname.trim()) errs.nickname = 'Please choose a nickname';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    socket.emit('room:join', { pin: pin.trim(), nickname: nickname.trim() });
  }

  return (
    <div className="player-page justify-center items-center">
      <div className="player-content animate-fade-in" style={{ maxWidth: '440px' }}>
        
        {/* Logo & Headline */}
        <div className="text-center" style={{ marginBottom: 'var(--sp-8)' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(124, 92, 252, 0.12)',
              border: '1px solid rgba(124, 92, 252, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--sp-3)',
            }}
          >
            <IconLogo size={32} color="var(--color-primary)" />
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '800',
              letterSpacing: '-0.03em',
              color: 'var(--color-player-text)',
            }}
          >
            QuizArena
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--color-player-text-muted)', marginTop: '4px' }}>
            Instant Local Multiplayer Quiz
          </p>
        </div>

        {/* Join Form Card */}
        <form onSubmit={handleJoin} className="player-card flex flex-col gap-4">
          {errors.general && (
            <div
              className="card text-center"
              style={{
                padding: 'var(--sp-3)',
                background: 'rgba(255, 90, 95, 0.1)',
                borderColor: 'var(--color-ans-a)',
                color: 'var(--color-ans-a)',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {errors.general}
            </div>
          )}

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block"
              style={{ color: 'var(--color-player-text-muted)', marginBottom: 'var(--sp-2)' }}
              htmlFor="room-pin"
            >
              Game PIN
            </label>
            <input
              id="room-pin"
              className="player-input font-mono"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="e.g. 849201"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setErrors((prev) => ({ ...prev, pin: '' }));
              }}
              autoFocus
              style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '24px', fontWeight: '700' }}
            />
            {errors.pin && (
              <span className="text-xs text-coral font-semibold" style={{ display: 'block', marginTop: '6px' }}>
                {errors.pin}
              </span>
            )}
          </div>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block"
              style={{ color: 'var(--color-player-text-muted)', marginBottom: 'var(--sp-2)' }}
              htmlFor="nickname"
            >
              Your Nickname
            </label>
            <input
              id="nickname"
              className="player-input"
              type="text"
              maxLength={20}
              placeholder="e.g. Alex"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setErrors((prev) => ({ ...prev, nickname: '' }));
              }}
              style={{ textAlign: 'center', fontWeight: '600' }}
            />
            {errors.nickname && (
              <span className="text-xs text-coral font-semibold" style={{ display: 'block', marginTop: '6px' }}>
                {errors.nickname}
              </span>
            )}
          </div>

          <button
            id="join-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 'var(--sp-2)' }}
          >
            <IconPlay size={18} />
            <span>{loading ? 'Joining Arena…' : 'Enter Arena'}</span>
          </button>
        </form>

        <p className="text-center text-xs" style={{ color: 'var(--color-player-text-muted)', marginTop: 'var(--sp-6)' }}>
          Connected locally via WiFi. No account or registration needed.
        </p>
      </div>
    </div>
  );
}
