// api/index.js — ChatAfrica Backend (Vercel Serverless + Socket.io)
const { createServer } = require('http');
const { Server } = require('socket.io');

// Vercel supporte Socket.io via polling (WebSocket limité en serverless)
// Pour un vrai WebSocket persistant, on utilise Vercel + adapter externe
// Solution légère : Socket.io avec polling long + fallback

let io;

module.exports = (req, res) => {
  if (!io) {
    const httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
      // OPTIMISATION AFRIQUE : polling d'abord, upgrade ensuite
      transports: ['polling', 'websocket'],
      // Timeouts généreux pour connexions lentes
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      // Compression activée
      perMessageDeflate: true,
      httpCompression: true,
    });

    // --- LOGIQUE DE MATCHING ---
    const waitingUsers = { video: [], text: [] };
    const rooms = new Map();

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('find-partner', ({ mode = 'video' }) => {
        const queue = waitingUsers[mode] || waitingUsers.video;

        if (queue.length > 0) {
          const partner = queue.shift();
          const roomId = `room_${socket.id}_${partner.id}`;

          socket.join(roomId);
          partner.join(roomId);

          rooms.set(socket.id, { roomId, partnerId: partner.id });
          rooms.set(partner.id, { roomId, partnerId: socket.id });

          io.to(roomId).emit('partner-found', { roomId });
          socket.emit('init-call', { initiator: true });
          partner.emit('init-call', { initiator: false });
        } else {
          queue.push(socket);
          socket.emit('waiting');
        }
      });

      socket.on('signal', ({ signal }) => {
        const room = rooms.get(socket.id);
        if (room) {
          socket.to(room.roomId).emit('signal', { signal });
        }
      });

      socket.on('message', ({ text }) => {
        const room = rooms.get(socket.id);
        if (room && text?.trim()) {
          socket.to(room.roomId).emit('message', {
            text: text.slice(0, 500), // limite taille message
            from: 'other',
          });
        }
      });

      socket.on('next', () => {
        leaveRoom(socket);
        socket.emit('disconnected-from-partner');
      });

      socket.on('disconnect', () => {
        leaveRoom(socket);
        // Retire de la file d'attente
        Object.values(waitingUsers).forEach(queue => {
          const idx = queue.findIndex(s => s.id === socket.id);
          if (idx !== -1) queue.splice(idx, 1);
        });
      });

      function leaveRoom(socket) {
        const room = rooms.get(socket.id);
        if (room) {
          socket.to(room.roomId).emit('partner-disconnected');
          rooms.delete(socket.id);
          rooms.delete(room.partnerId);
        }
      }
    });
  }

  // Handle Socket.io HTTP requests
  io.attach(res.socket?.server);
  res.end();
};
