import { io } from 'socket.io-client';

// In dev, Vite proxies /socket.io → localhost:3001
// In LAN demo, window.location.origin points to the host's IP
const URL = import.meta.env.DEV ? '/' : window.location.origin;

const socket = io(URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
