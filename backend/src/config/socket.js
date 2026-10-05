import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Client can emit 'join_room' with their userId to receive personal notifications
    socket.on('join_room', (userId) => {
      socket.join(userId);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() {
  return io;
}
