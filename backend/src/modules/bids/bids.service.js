import { AppError } from '../../utils/errors.js';
import { computeBidGuaranteeCents } from '../payments/guarantees.service.js';

const AUCTION_LIVE_CACHE_KEY = (auctionId) => `auction:${auctionId}:live`;
const AUCTION_LIVE_TTL_MS = 120_000;

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError({
      code: 'INVALID_AMOUNT',
      message: 'El monto de la puja es inválido',
      status: 422,
    });
  }
  return Math.round(amount * 100) / 100; // exacto a 2 decimales
}

/**
 * Servicio de pujas. La fuente de verdad es PostgreSQL; Redis solo cachea el
 * estado "caliente" para lecturas de baja latencia.
 */
export class BidService {
  constructor({ pool, cache, walletService }) {
    this.pool = pool;
    this.cache = cache;
    this.walletService = walletService;
  }

  /**
   * Puja en vivo:
   *  - Bloqueo pesimista de la fila de la subasta (SELECT ... FOR UPDATE) para
   *    que dos pujas concurrentes nunca se pispen el precio.
   *  - Valida estado, tiempo restante y monto mínimo.
   *  - Persiste la puja, actualiza el precio vigente y aplica anti-snipe.
   */
  async placeBid({ auctionId, bidderId, amount }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [auction] } = await client.query(
        `SELECT a.*, c.type AS category_type
         FROM auctions a
         JOIN products p ON p.id = a.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE a.id = $1
         FOR UPDATE OF a`,
        [auctionId],
      );

      if (!auction) {
        throw new AppError({
          code: 'AUCTION_NOT_FOUND',
          message: 'Subasta no encontrada',
          status: 404,
        });
      }
      if (auction.status !== 'ACTIVE') {
        throw new AppError({
          code: 'AUCTION_NOT_ACTIVE',
          message: 'La subasta no está activa',
          status: 409,
        });
      }
      if (auction.seller_id === bidderId) {
        throw new AppError({
          code: 'SELLER_CANNOT_BID',
          message: 'No puedes pujar por tu propia subasta',
          status: 403,
        });
      }

      const endMs = new Date(
        auction.extended_until ?? auction.ends_at,
      ).getTime();
      if (Date.now() >= endMs) {
        throw new AppError({
          code: 'AUCTION_CLOSED',
          message: 'La subasta ya finalizó',
          status: 409,
        });
      }

      const amountRounded = normalizeAmount(amount);
      const currentPrice = Number(
        auction.current_price ?? auction.starting_price,
      );
      const minimumBid = currentPrice + Number(auction.min_increment);

      if (amountRounded < minimumBid) {
        throw new AppError({
          code: 'BID_BELOW_MINIMUM',
          message: `La puja mínima es S/ ${minimumBid.toFixed(2)}`,
          status: 422,
          details: { minimumBid },
        });
      }

      // Depósito de participación (STANDARD): retiene S/10 de la billetera
      // para asegurar que el postor es serio. Se libera si pierde y se aplica
      // al pago final si gana.
      if (auction.flow === 'STANDARD') {
        const startingPriceCents = Math.round(Number(auction.starting_price) * 100);
        const guaranteeCents = computeBidGuaranteeCents({
          flow: auction.flow,
          categoryType: auction.category_type,
          startingPriceCents,
        });
        await this.walletService.holdForBid({
          client,
          userId: bidderId,
          auctionId,
          amountCents: guaranteeCents,
        });
      }

      const { rows: [bid] } = await client.query(
        `INSERT INTO bids (auction_id, bidder_id, amount)
         VALUES ($1, $2, $3)
         RETURNING id, auction_id, bidder_id, amount, created_at`,
        [auctionId, bidderId, amountRounded],
      );

      await client.query(
        `UPDATE auctions
         SET current_price = $1, top_bid_id = $2, updated_at = now()
         WHERE id = $3`,
        [amountRounded, bid.id, auctionId],
      );

      // Anti-snipe: si la puja entra en la ventana final, se extiende el reloj.
      let extendedUntil = null;
      const antiSnipeMs = Number(auction.anti_snipe_seconds ?? 60) * 1000;
      if (Date.now() + antiSnipeMs >= endMs) {
        extendedUntil = new Date(endMs + antiSnipeMs);
        await client.query(
          `UPDATE auctions
           SET extended_until = $1, updated_at = now()
           WHERE id = $2`,
          [extendedUntil, auctionId],
        );
      }

      await client.query('COMMIT');

      const endsAt = extendedUntil ?? auction.ends_at;
      await this.#setLiveState(auctionId, {
        price: amountRounded,
        minimumBid: amountRounded + Number(auction.min_increment),
        endsAt,
      });

      return {
        bid,
        auctionId,
        currentPrice: amountRounded,
        previousPrice: currentPrice,
        minimumBid: amountRounded + Number(auction.min_increment),
        extendedUntil,
        endsAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Estado "caliente" que se sirve a un cliente al unirse a una subasta. */
  async getLiveState(auctionId) {
    const cached = await this.#getLiveState(auctionId);
    if (cached) return cached;

    const { rows: [auction] } = await this.pool.query(
      `SELECT id, status, starting_price, current_price, min_increment,
              ends_at, extended_until,
              COALESCE(extended_until, ends_at) AS live_ends_at
       FROM auctions
       WHERE id = $1`,
      [auctionId],
    );

    if (!auction) {
      throw new AppError({
        code: 'AUCTION_NOT_FOUND',
        message: 'Subasta no encontrada',
        status: 404,
      });
    }

    const price = Number(auction.current_price ?? auction.starting_price);
    const state = {
      auctionId: auction.id,
      status: auction.status,
      price,
      minimumBid: price + Number(auction.min_increment),
      endsAt: auction.live_ends_at,
    };
    await this.#setLiveState(auctionId, state);
    return state;
  }

  async #getLiveState(auctionId) {
    try {
      const raw = await this.cache.get(AUCTION_LIVE_CACHE_KEY(auctionId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async #setLiveState(auctionId, state) {
    try {
      await this.cache.set(
        AUCTION_LIVE_CACHE_KEY(auctionId),
        JSON.stringify(state),
        AUCTION_LIVE_TTL_MS,
      );
    } catch {
      // el caché nunca debe romper el flujo de pujas
    }
  }
}
