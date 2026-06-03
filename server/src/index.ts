import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
app.use(cors());

// Render fournit PORT automatiquement
const PORT = process.env.PORT || 8000;

const httpServer = createServer(app);

app.get('/', (_req, res) => res.json({ name: 'ChatAfrica Signaling Server', status: 'running' }));
app.get('/ping', (_req, res) => res.json({ status: 'alive' }));

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      /\.vercel\.app$/,
      /\.onrender\.com$/,
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  // Timeouts généreux pour connexions lentes (Afrique)
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  // Compression pour économiser la bande passante
  perMessageDeflate: true,
  httpCompression: true,
});

// --- State ---
interface Room {
  roomId: string;
  partnerId: string;
}

const waitingUsers: { video: Socket[]; text: Socket[] } = {
  video: [],
  text: [],
};
const rooms = new Map<string, Room>();

let online = 0;

io.on('connection', (socket: Socket) => {
  online++;
  io.emit('online', online);
  console.log(`[+] Connected: ${socket.id} | Online: ${online}`);

  // --- Matching ---
  socket.on('find-partner', ({ mode = 'video' }: { mode?: string }) => {
    const queue = mode === 'text' ? waitingUsers.text : waitingUsers.video;

    // Retire l'utilisateur de toute file d'attente existante
    removeFromQueues(socket);

    if (queue.length > 0) {
      const partner = queue.shift()!;
      const roomId = `room_${socket.id}_${partner.id}`;

      socket.join(roomId);
      partner.join(roomId);

      rooms.set(socket.id, { roomId, partnerId: partner.id });
      rooms.set(partner.id, { roomId, partnerId: socket.id });

      io.to(roomId).emit('partner-found', { roomId });
      // L'initiateur crée l'offre WebRTC
      socket.emit('init-call', { initiator: true });
      partner.emit('init-call', { initiator: false });

      console.log(`[Room] ${socket.id} ↔ ${partner.id} | Room: ${roomId}`);
    } else {
      queue.push(socket);
      socket.emit('waiting');
      console.log(`[Wait] ${socket.id} | Queue ${mode}: ${queue.length}`);
    }
  });

  // --- WebRTC Signaling (simple-peer) ---
  socket.on('signal', ({ signal }: { signal: unknown }) => {
    const room = rooms.get(socket.id);
    if (room) {
      socket.to(room.roomId).emit('signal', { signal });
    }
  });

  // --- Messages texte ---
  socket.on('message', ({ text }: { text: string }) => {
    const room = rooms.get(socket.id);
    if (room && text?.trim()) {
      socket.to(room.roomId).emit('message', {
        text: text.slice(0, 500), // Limite sécurité
        from: 'other',
      });
    }
  });

  // --- Suivant ---
  socket.on('next', () => {
    leaveRoom(socket);
  });

  // --- Déconnexion ---
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    removeFromQueues(socket);
    leaveRoom(socket);
    console.log(`[-] Disconnected: ${socket.id} | Online: ${online}`);
  });

  // --- Helpers ---
  function leaveRoom(sock: Socket) {
    const room = rooms.get(sock.id);
    if (room) {
      sock.to(room.roomId).emit('partner-disconnected');
      rooms.delete(sock.id);
      rooms.delete(room.partnerId);
      sock.leave(room.roomId);
    }
  }

  function removeFromQueues(sock: Socket) {
    (['video', 'text'] as const).forEach((mode) => {
      const idx = waitingUsers[mode].findIndex((s) => s.id === sock.id);
      if (idx !== -1) waitingUsers[mode].splice(idx, 1);
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(`ChatAfrica server running on port ${PORT}`);
});
