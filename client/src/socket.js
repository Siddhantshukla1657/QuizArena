import { io } from 'socket.io-client';

// Connect to current origin (handles localhost, LAN IP, port forwarding, or cloud URL)
const URL = window.location.origin;

const socket = io(URL, {
  autoConnect: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
  timeout: 10000,
  transports: ['polling', 'websocket'], // Robust fallback for proxy, mobile networks, and port-forwarding
});

// Automatically re-register session on EVERY socket connect or reconnect!
socket.on('connect', () => {
  const pin = sessionStorage.getItem('qa_pin');
  const sessionToken =
    sessionStorage.getItem('qa_session_token') ||
    sessionStorage.getItem('qa_sessionToken');
  const nickname = sessionStorage.getItem('qa_nickname');

  if (pin && sessionToken) {
    socket.emit('player:reconnect', { pin, sessionToken, nickname });
  }
});

export default socket;
