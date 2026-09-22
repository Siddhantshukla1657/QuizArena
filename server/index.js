/**
 * server/index.js - Express + Socket.IO entry point
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const quizRoutes = require('./routes/quizzes');
const registerSocketHandlers = require('./socket/index');

const PORT = process.env.PORT || 3001;

async function main() {
  // Initialize database first
  await db.init();
  console.log('✅ Database ready');

  const app = express();
  const server = http.createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // REST API
  app.use('/api/quizzes', quizRoutes);

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Server info (used for LAN QR code detection)
  app.get('/api/server-info', (req, res) => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const iface of Object.values(nets)) {
      for (const net of iface) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIp = net.address;
          break;
        }
      }
    }
    res.json({ lanIp, port: PORT });
  });

  // Serve static client build (for production LAN demo)
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (require('fs').existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  // Socket.IO handlers
  registerSocketHandlers(io);

  // Handle port conflict gracefully
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use by another running instance.`);
      console.error(`Please close any existing QuizArena terminal windows or release port ${PORT}.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  // Bind to 0.0.0.0 for LAN access
  server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const iface of Object.values(nets)) {
      for (const net of iface) {
        if (net.family === 'IPv4' && !net.internal) { lanIp = net.address; break; }
      }
    }
    console.log(`\n🎯 QuizArena server running`);
    console.log(`   Local:  http://localhost:${PORT}`);
    console.log(`   LAN:    http://${lanIp}:${PORT}`);
    console.log(`\n   Host dashboard: http://localhost:${PORT}/`);
    console.log(`   Player join:    http://${lanIp}:${PORT}/join\n`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
