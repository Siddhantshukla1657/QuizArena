import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import socket from '../socket';
import {
  IconLogo,
  IconPlay,
  IconCopy,
  IconCheck,
  IconUsers,
  IconSignal,
  IconQr,
  IconLink,
} from '../components/Icons';

export default function Lobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let active = true;

    async function generateQr() {
      let baseOrigin = window.location.origin;

      // When running locally, fetch LAN IP from server so phone camera scanning works seamlessly
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await fetch('/api/server-info');
          if (res.ok) {
            const data = await res.json();
            if (data.lanIp && data.lanIp !== 'localhost') {
              const port = window.location.port ? `:${window.location.port}` : '';
              baseOrigin = `http://${data.lanIp}${port}`;
            }
          }
        } catch {
          // fallback to window.location.origin
        }
      }

      const fullJoinUrl = `${baseOrigin}/join?pin=${pin}`;
      if (active) setJoinUrl(fullJoinUrl);

      try {
        const dataUrl = await QRCode.toDataURL(fullJoinUrl, {
          width: 320,
          margin: 1,
          color: {
            dark: '#14121F',
            light: '#ffffff',
          },
        });
        if (active) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    }

    if (pin) generateQr();

    return () => {
      active = false;
    };
  }, [pin]);

  useEffect(() => {
    // Listen for lobby updates
    socket.on('lobby:update', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers || []);
    });

    // When host:control 'start' triggers, navigate to live view
    socket.on('question:show', (data) => {
      navigate(`/live/${pin}`, { state: { question: data } });
    });

    socket.on('room:error', ({ message }) => alert('Error: ' + message));

    return () => {
      socket.off('lobby:update');
      socket.off('question:show');
      socket.off('room:error');
    };
  }, [pin, navigate]);

  function startQuiz() {
    if (players.length === 0) {
      if (!confirm('No players have joined yet. Start anyway?')) return;
    }
    setStarting(true);
    socket.emit('host:control', { pin, action: 'start' });
  }

  function copyPin() {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const MAX_VISIBLE = 48;
  const visiblePlayers = players.slice(0, MAX_VISIBLE);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-6)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
        <IconLogo size={28} color="var(--color-primary-light)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>
          QuizArena
        </span>
      </div>

      {/* Hero PIN & QR Card */}
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: '740px',
          width: '100%',
          marginBottom: 'var(--sp-6)',
          padding: 'var(--sp-6) var(--sp-8)',
          background: 'linear-gradient(180deg, var(--color-surface) 0%, rgba(29, 26, 46, 0.95) 100%)',
          borderColor: 'rgba(124, 92, 252, 0.35)',
        }}
      >
        <div className="lobby-hero-grid">
          {/* Left Column: Game PIN & Manual Join Info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="flex items-center justify-center gap-2" style={{ marginBottom: 'var(--sp-2)' }}>
              <span className="text-xs text-muted font-bold uppercase tracking-wider">
                Game Room PIN
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={copyPin}
                style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--color-primary-light)' }}
                title="Copy PIN"
              >
                {copied ? <IconCheck size={12} strokeWidth={3} /> : <IconCopy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="pin-display-hero">{pin}</div>

            <p className="text-secondary text-sm font-medium" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
              Go to <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>/join</strong> and enter PIN
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={copyLink}
              style={{
                gap: '6px',
                fontSize: '12px',
                background: 'rgba(124, 92, 252, 0.12)',
                borderColor: 'rgba(124, 92, 252, 0.3)',
                color: 'var(--color-primary-light)',
              }}
            >
              {copiedLink ? <IconCheck size={14} strokeWidth={3} /> : <IconLink size={14} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="lobby-divider" />

          {/* Right Column: QR Code */}
          <div className="lobby-qr-container">
            <div className="flex items-center gap-1 text-xs text-muted font-bold uppercase tracking-wider" style={{ marginBottom: 'var(--sp-1)' }}>
              <IconQr size={14} />
              <span>Scan to Join</span>
            </div>

            <div className="lobby-qr-frame">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`Scan QR code to join room ${pin}`} />
              ) : (
                <div style={{ width: '168px', height: '168px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
              )}
            </div>

            <span className="text-xs text-secondary" style={{ marginTop: 'var(--sp-1)' }}>
              Point camera to join with PIN
            </span>
          </div>
        </div>
      </div>

      {/* Live Players Roster */}
      <div
        className="card animate-fade-in"
        style={{ maxWidth: '740px', width: '100%', marginBottom: 'var(--sp-8)' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="flex items-center gap-2">
            <IconSignal size={18} color="var(--color-live)" />
            <span className="font-bold text-sm">Players Connected</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span
              style={{
                fontSize: '28px',
                fontWeight: '800',
                color: 'var(--color-primary-light)',
              }}
            >
              {players.length}
            </span>
            <IconUsers size={20} className="text-muted" />
          </div>
        </div>

        {players.length === 0 ? (
          <div className="text-center" style={{ padding: 'var(--sp-8)' }}>
            <div className="spinner" style={{ margin: '0 auto var(--sp-4)', width: '28px', height: '28px' }} />
            <p className="text-secondary text-sm">Waiting for participants to join...</p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--sp-2)',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: 'var(--sp-1)',
            }}
          >
            {visiblePlayers.map((p, i) => (
              <span
                key={p.sessionToken || p.nickname}
                className="badge badge-primary animate-fade-in"
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  animationDelay: `${i * 20}ms`,
                }}
              >
                {p.nickname}
              </span>
            ))}
            {players.length > MAX_VISIBLE && (
              <span className="badge" style={{ color: 'var(--color-text-muted)' }}>
                +{players.length - MAX_VISIBLE} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Launch Action */}
      <button
        id="start-quiz-btn"
        className="btn btn-primary btn-lg"
        disabled={starting}
        onClick={startQuiz}
        style={{
          minWidth: '240px',
          boxShadow: players.length > 0 ? '0 0 32px var(--color-primary-glow)' : undefined,
        }}
      >
        <IconPlay size={20} />
        <span>{starting ? 'Starting Session…' : 'Start Quiz'}</span>
      </button>

      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 'var(--sp-4)' }}
        onClick={() => navigate('/')}
      >
        ← Return to Dashboard
      </button>
    </div>
  );
}
