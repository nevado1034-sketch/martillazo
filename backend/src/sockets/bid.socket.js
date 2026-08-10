import { AppError } from '../utils/errors.js';

const auctionRoom = (auctionId) => `auction:${auctionId}`;

/**
 * Eventos WebSocket del dominio de pujas:
 *
 *  client -> server
 *    bid:join   { auctionId }              -> entra a la sala y recibe el estado
 *    bid:place  { auctionId, amount }      -> coloca una puja (requiere token)
 *    bid:leave  { auctionId }
 *
 *  server -> client (broadcast a la sala)
 *    bid:new            { auctionId, bidderId, currentPrice, previousPrice,
 *                         minimumBid, endsAt, extended }
 *    auction:extended   { auctionId, endsAt }
 *    auction:error      { code, message } (unicast al emisor)
 */
export function registerBidSocket(io, { bidService }) {
  io.on('connection', (socket) => {
    const user = socket.data.user ?? null;

    socket.on('bid:join', async (payload = {}, ack) => {
      const { auctionId } = payload;
      try {
        if (!auctionId) {
          throw new AppError({
            code: 'INVALID_PAYLOAD',
            message: 'auctionId es requerido',
            status: 422,
          });
        }
        await socket.join(auctionRoom(auctionId));
        const state = await bidService.getLiveState(auctionId);
        ack?.({ ok: true, data: state });
      } catch (err) {
        ack?.({ ok: false, error: toSocketError(err) });
      }
    });

    socket.on('bid:place', async (payload = {}, ack) => {
      const { auctionId, amount } = payload;
      try {
        if (!user) {
          throw new AppError({
            code: 'UNAUTHORIZED',
            message: 'Debes iniciar sesión para pujar',
            status: 401,
          });
        }

        const result = await bidService.placeBid({
          auctionId,
          bidderId: user.id,
          amount,
        });

        const broadcast = {
          auctionId: result.auctionId,
          bidderId: user.id,
          currentPrice: result.currentPrice,
          previousPrice: result.previousPrice,
          minimumBid: result.minimumBid,
          endsAt: result.endsAt,
          extended: Boolean(result.extendedUntil),
        };

        io.to(auctionRoom(auctionId)).emit('bid:new', broadcast);

        if (result.extendedUntil) {
          io.to(auctionRoom(auctionId)).emit('auction:extended', {
            auctionId,
            endsAt: result.extendedUntil,
          });
        }

        ack?.({
          ok: true,
          data: {
            currentPrice: result.currentPrice,
            minimumBid: result.minimumBid,
            endsAt: result.endsAt,
          },
        });
      } catch (err) {
        ack?.({ ok: false, error: toSocketError(err) });
      }
    });

    socket.on('bid:leave', ({ auctionId } = {}) => {
      if (auctionId) socket.leave(auctionRoom(auctionId));
    });

    socket.on('disconnect', () => {});
  });
}

function toSocketError(err) {
  const status = err.status ?? 500;
  return {
    code: err.code ?? 'INTERNAL_ERROR',
    message:
      status >= 500
        ? 'Error interno del servidor'
        : err.message,
    ...(err.details ? { details: err.details } : {}),
  };
}
