import { randomUUID } from 'node:crypto';

/**
 * Finalizador de subastas. Encuentra subastas ACTIVAS cuyo plazo
 * (extended_until/ends_at) ya venció y las cierra:
 *   - con pujas   -> status AWARDED, winner_id, winning_bid_id, top_bid_id,
 *                    la puja ganadora queda WON y el resto OUTBID.
 *                    En STANDARD se crea la confirmación de entrega.
 *   - sin pujas   -> status EXPIRED.
 *
 * Concurrencia: selecciona con FOR UPDATE SKIP LOCKED para que varios
 * procesos (o ticks) nunca cierren la misma subasta dos veces.
 */
export class AuctionCloser {
  constructor({ pool, walletService, intervalMs = 15_000 }) {
    this.pool = pool;
    this.walletService = walletService;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    this.runOnce().catch((err) =>
      console.error('[closer] primer ciclo falló:', err.message),
    );
    this.timer = setInterval(
      () => this.runOnce().catch((err) => console.error('[closer] error:', err.message)),
      this.intervalMs,
    );
    this.timer.unref?.();
    console.log(`[closer] finalizador activo (cada ${this.intervalMs} ms)`);
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: due } = await client.query(
        `SELECT id, seller_id, flow
         FROM auctions
         WHERE status = 'ACTIVE'
           AND COALESCE(extended_until, ends_at) <= now()
         FOR UPDATE SKIP LOCKED`,
      );

      for (const auction of due) {
        await this.#closeAuction(client, auction);
      }

      await client.query('COMMIT');
      return due.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async #closeAuction(client, auction) {
    const { rows: [topBid] } = await client.query(
      `SELECT id, bidder_id, amount
       FROM bids
       WHERE auction_id = $1
       ORDER BY amount DESC, created_at ASC
       LIMIT 1`,
      [auction.id],
    );

    if (!topBid) {
      await client.query(
        `UPDATE auctions SET status = 'EXPIRED', closed_at = now() WHERE id = $1`,
        [auction.id],
      );
      await this.walletService?.releaseAllHolds({ client, auctionId: auction.id });
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES (NULL, 'AUCTION_EXPIRED', 'auction', $1, $2)`,
        [auction.id, JSON.stringify({ reason: 'no_bids' })],
      );
      return;
    }

    const { rows: [updated] } = await client.query(
      `UPDATE auctions
       SET status = 'AWARDED',
           winner_id = $2,
           winning_bid_id = $3,
           top_bid_id = $3,
           current_price = $4,
           closed_at = now()
       WHERE id = $1
       RETURNING id, seller_id, flow, current_price, winner_id`,
      [auction.id, topBid.bidder_id, topBid.id, topBid.amount],
    );

    await client.query(
      `UPDATE bids
       SET bid_status = CASE WHEN id = $2 THEN 'WON'::bid_status ELSE 'OUTBID'::bid_status END
       WHERE auction_id = $1`,
      [auction.id, topBid.id],
    );

    if (updated.flow === 'STANDARD') {
      await client.query(
        `INSERT INTO delivery_confirmations (id, auction_id, buyer_id, seller_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (auction_id) DO NOTHING`,
        [randomUUID(), updated.id, updated.winner_id, updated.seller_id],
      );
    }

    // Depósito del ganador -> aplicado al pago final; perdedores -> liberados.
    await this.walletService?.resolveAuctionHolds({
      client,
      auctionId: updated.id,
      winnerId: updated.winner_id,
      sellerId: updated.seller_id,
    });

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES (NULL, 'AUCTION_AWARDED', 'auction', $1, $2)`,
      [
        updated.id,
        JSON.stringify({ winnerId: updated.winner_id, amount: updated.current_price }),
      ],
    );
  }
}
