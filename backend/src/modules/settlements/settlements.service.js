import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/errors.js';

/**
 * Cierre del ciclo de venta (flujo STANDARD):
 *   1) El ganador paga la garantía -> custodia (HOLD_ESCROW).
 *   2) El ganador confirma la recepción del producto (48h).
 *   3) El vendedor cierra la venta -> se libera el escrow al vendedor,
 *      descontando la comisión de la plataforma, y la subasta queda COMPLETED.
 */
export class SettlementService {
  constructor({ pool, paymentService }) {
    this.pool = pool;
    this.paymentService = paymentService;
  }

  /** Estado de la operación para el detalle: entrega y pago en custodia. */
  async getState({ auctionId }) {
    const [auction, delivery, payment] = await Promise.all([
      this.pool.query(
        `SELECT id, status, flow, winner_id, seller_id, current_price, closed_at
         FROM auctions WHERE id = $1`,
        [auctionId],
      ),
      this.pool.query(
        `SELECT buyer_confirmed, buyer_confirmed_at, seller_confirmed, seller_confirmed_at,
                dispute_opened
         FROM delivery_confirmations WHERE auction_id = $1`,
        [auctionId],
      ),
      this.pool.query(
        `SELECT id, status, amount_cents, escrow_status, released_at, net_to_seller_cents
         FROM transacciones
         WHERE auction_id = $1 AND type = 'PAYMENT'
         ORDER BY created_at DESC LIMIT 1`,
        [auctionId],
      ),
    ]);
    if (!auction.rows[0]) {
      throw new AppError({
        code: 'AUCTION_NOT_FOUND',
        message: 'Subasta no encontrada',
        status: 404,
      });
    }
    return {
      auction: auction.rows[0],
      delivery: delivery.rows[0] ?? null,
      payment: payment.rows[0] ?? null,
    };
  }

  /** El ganador confirma que recibió el producto (abre la ventana de 48h). */
  async confirmDelivery({ auctionId, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [auction] } = await client.query(
        'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
        [auctionId],
      );
      if (!auction) {
        throw new AppError({
          code: 'AUCTION_NOT_FOUND',
          message: 'Subasta no encontrada',
          status: 404,
        });
      }
      if (auction.winner_id !== userId) {
        throw new AppError({
          code: 'NOT_THE_WINNER',
          message: 'Solo el ganador puede confirmar la recepción',
          status: 403,
        });
      }
      if (!['AWARDED', 'COMPLETED'].includes(auction.status)) {
        throw new AppError({
          code: 'AUCTION_NOT_AWARDED',
          message: 'La subasta aún no tiene un ganador',
          status: 409,
        });
      }
      if (auction.flow !== 'STANDARD') {
        throw new AppError({
          code: 'FLOW_NOT_SUPPORTED',
          message: 'La confirmación de entrega aplica al flujo STANDARD',
          status: 422,
        });
      }

      const { rows: [delivery] } = await client.query(
        `INSERT INTO delivery_confirmations
           (id, auction_id, buyer_id, seller_id, buyer_confirmed, buyer_confirmed_at)
         VALUES ($1, $2, $3, $4, TRUE, now())
         ON CONFLICT (auction_id)
         DO UPDATE SET buyer_confirmed = TRUE, buyer_confirmed_at = now()
         RETURNING auction_id, buyer_confirmed, buyer_confirmed_at`,
        [randomUUID(), auctionId, userId, auction.seller_id],
      );

      await client.query('COMMIT');
      return delivery;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** El vendedor cierra la venta: libera el escrow y marca la subasta COMPLETED. */
  async settle({ auctionId, userId }) {
    const { rows: [auction] } = await this.pool.query(
      `SELECT id, seller_id, status, flow FROM auctions WHERE id = $1`,
      [auctionId],
    );
    if (!auction) {
      throw new AppError({
        code: 'AUCTION_NOT_FOUND',
        message: 'Subasta no encontrada',
        status: 404,
      });
    }
    if (auction.seller_id !== userId) {
      throw new AppError({
        code: 'AUCTION_NOT_YOURS',
        message: 'Solo el vendedor puede cerrar la venta',
        status: 403,
      });
    }
    if (auction.status !== 'AWARDED') {
      throw new AppError({
        code: 'AUCTION_NOT_AWARDED',
        message: 'La subasta no está adjudicada',
        status: 409,
      });
    }
    if (auction.flow !== 'STANDARD') {
      throw new AppError({
        code: 'FLOW_NOT_SUPPORTED',
        message: 'El cierre con escrow aplica al flujo STANDARD',
        status: 422,
      });
    }

    const { rows: [payment] } = await this.pool.query(
      `SELECT id FROM transacciones
       WHERE auction_id = $1 AND type = 'PAYMENT' AND status = 'HOLD_ESCROW'`,
      [auctionId],
    );
    if (!payment) {
      throw new AppError({
        code: 'PAYMENT_NOT_FOUND',
        message: 'El ganador aún no ha pagado la garantía',
        status: 409,
      });
    }

    // La liberación valida la confirmación de entrega (48h) y paga el neto.
    const released = await this.paymentService.releaseEscrowPayment({
      transactionId: payment.id,
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE delivery_confirmations
         SET seller_confirmed = TRUE, seller_confirmed_at = now()
         WHERE auction_id = $1`,
        [auctionId],
      );
      await client.query(
        `UPDATE auctions
         SET status = 'COMPLETED', closed_at = now()
         WHERE id = $1`,
        [auctionId],
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, 'AUCTION_COMPLETED', 'auction', $2, $3)`,
        [userId, auctionId, JSON.stringify({ released })],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { auctionId, status: 'COMPLETED', released };
  }
}
