import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { handelStart, handelDisconnect, getType } from './lib';
import { GetTypesResult, room } from './types';

const app = express();
app.use(cors());

// Render fournit PORT automatiquement — fallback 8000 en local
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/ping', (req, res) => res.json({ status: 'alive' }));

// CORS ouvert pour Vercel + localhost dev
const io = new Server(server, {
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
  // Permet les WebSockets + polling (fallback connexions lentes)
  transports: ['websocket', 'polling'],
});

let online: number = 0;
let roomArr: Array<room> = [];

io.on('connection', (socket) => {
  online++;
  io.emit('online', online);

  // on start
  socket.on('start', cb => {
    handelStart(roomArr, socket, cb, io);
  });

  // On disconnection
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    handelDisconnect(socket.id, roomArr, io);
  });

  /// ------- WebRTC signaling ------

  // ice candidate relay
  socket.on('ice:send', ({ candidate }) => {
    let type: GetTypesResult = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string'
          && io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
      } else if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string'
          && io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
      }
    }
  });

  // sdp relay
  socket.on('sdp:send', ({ sdp }) => {
    let type = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string'
          && io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
      }
      if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string'
          && io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
      }
    }
  });

  /// --------- Messages -----------

  socket.on('send-message', (input, type, roomid) => {
    if (type == 'p1') type = 'You: ';
    else if (type == 'p2') type = 'Stranger: ';
    socket.to(roomid).emit('get-message', input, type);
  });
});
