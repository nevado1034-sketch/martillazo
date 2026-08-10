import { useCallback } from 'react';
import { createAuctionSocket } from '../api/socket.js';
import { SOCIAL_DEMO_ACCOUNTS, socialLogin } from '../api/auth.js';

/**
 * Pujas sobre una subasta con un socket efímero autenticado.
 * Garantiza sesión (creando la demo de comprador si no la hay).
 */
export default function useAuctionBid(session, onSession) {
  const ensureSession = useCallback(
    async (provider) => {
      if (session?.token) return session;
      const next = await socialLogin(SOCIAL_DEMO_ACCOUNTS[provider]);
      onSession({ ...next, provider });
      return next;
    },
    [session, onSession],
  );

  const placeBid = useCallback(
    (auctionId, amount) =>
      new Promise((resolve, reject) => {
        (async () => {
          let token = session?.token;
          if (!token) {
            try {
              const next = await ensureSession('google');
              token = next.token;
            } catch {
              reject(new Error('Inicia sesión para pujar'));
              return;
            }
          }

          const socket = createAuctionSocket({ token });
          socket.on('connect_error', () => {
            socket.disconnect();
            reject(new Error('No hay conexión con el servidor de pujas'));
          });
          socket.on('connect', () => {
            socket.emit('bid:place', { auctionId, amount }, (ack) => {
              socket.disconnect();
              if (!ack) {
                reject(new Error('El servidor no respondió'));
                return;
              }
              if (ack.ok) resolve(ack.data);
              else {
                const err = new Error(ack.error?.message ?? 'Error al pujar');
                err.code = ack.error?.code;
                reject(err);
              }
            });
          });
          setTimeout(() => {
            socket.disconnect();
            reject(new Error('Tiempo de espera agotado'));
          }, 8000);
        })();
      }),
    [session, ensureSession],
  );

  return { ensureSession, placeBid };
}
