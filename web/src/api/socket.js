import { io } from 'socket.io-client';
import { SOCKET_URL } from './config.js';

/**
 * Conexión WebSocket al backend de Martillazo.
 * @param {{ token?: string }} opts Token JWT opcional (necesario para pujar).
 */
export function createAuctionSocket({ token } = {}) {
  return io(SOCKET_URL, { auth: { token } });
}
