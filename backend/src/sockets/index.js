import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/auth.js';
import { registerBidSocket } from './bid.socket.js';

/**
 * Crea el servidor HTTP + Socket.IO compartiendo el mismo puerto.
 * La autenticación es opcional (usuarios anónimos pueden ver, no pujar);
 * el token viaja en handshake.auth.token y se expone en socket.data.user.
 */
export function createSocketServer(app, deps) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = verifyToken(token);
    if (user) {
      socket.data.user = { id: user.sub, role: user.role };
    }
    next();
  });

  registerBidSocket(io, deps);

  return { httpServer, io };
}
