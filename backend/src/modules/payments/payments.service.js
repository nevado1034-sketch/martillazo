import { AppError } from '../../utils/errors.js';
import {
  assertPositiveCents,
  toMinorUnits,
} from '../../utils/money.js';
import { creditEscrowAccount, debitEscrowAccount } from './escrow.js';

/** Ventana de 48 horas para confirmar la recepción del producto. */
export const DELIVERY_WINDOW_MS = 48 * 60 * 60 * 1000;

function assertBuyerConfirmedWithinWindow(delivery, now = Date.now()) {
  if (!delivery) {
    throw new AppError({
      code: 'DELIVERY_NOT_CONFIRMED',
      message: 'El comprador aún no confirma la recepción del producto',
      status: 409,
    });
  }
  if (delivery.dispute_opened) {
    throw new AppError({
      code: 'DISPUTE_OPENED',
      message: 'Existe una disputa activa: los fondos están congelados',
      status: 409,
    });
  }
  if (!delivery.buyer_confirmed_at) {
    throw new AppError({
      code: 'DELIVERY_NOT_CONFIRMED',
      message: 'El comprador aún no confirma la recepción del producto',
      status: 409,
    });
  }
  const elapsed = now - new Date(delivery.buyer_confirmed_at).getTime();
  if (elapsed > DELIVERY_WINDOW_MS) {
    throw new AppError({
      code: 'DELIVERY_WINDOW_EXPIRED',
      message: 'La confirmación excedió la ventana de 48 horas',
      status: 409,
    });
  }
}

/**
 * Motor de pagos y custodia (escrow) del flujo ESTÁNDAR.
 *
 * Flujo: ganador paga -> HOLD_ESCROW -> confirmación de entrega (48h)
 *        -> comisión 8% -> payout neto al vendedor -> COMPLETED.
 *
 * Concurrencia: cada operación abre transacción y bloquea sus filas con
 * SELECT ... FOR UPDATE. La doble ejecución de un pago se bloquea por índice
 * único parcial (auction_id, type='PAYMENT') y por idempotency_key.
 */
export class PaymentService {
  constructor({ pool, provider, commissionService }) {
    this.pool = pool;
    this.provider = provider;
    this.commissionService = commissionService;
  }

  /**
   * 1) Recibe el pago del ganador y lo congela en custodia (HOLD_ESCROW).
   */
  async processStandardPayment({
    auctionId,
    buyerId,
    amount,
    currency = 'PEN',
    sourceToken,
    idempotencyKey,
  }) {
    const amountCents = toMinorUnits(amount, currency);
    assertPositiveCents(amountCents);

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
      if (auction.flow !== 'STANDARD') {
        throw new AppError({
          code: 'FLOW_NOT_SUPPORTED',
          message: 'El flujo PREMIUM usa retención de garantía, no escrow directo',
          status: 422,
        });
      }
      if (!['AWARDED', 'COMPLETED'].includes(auction.status)) {
        throw new AppError({
          code: 'AUCTION_NOT_AWARDED',
          message: 'La subasta aún no tiene un ganador',
          status: 409,
        });
      }
      if (auction.winner_id !== buyerId) {
        throw new AppError({
          code: 'NOT_THE_WINNER',
          message: 'Solo el ganador de la subasta puede pagar',
          status: 403,
        });
      }

      const finalCents = Math.round(Number(auction.current_price ?? auction.starting_price) * 100);

      // El depósito del ganador (billetera) ya está abonado: solo se cobra el
      // saldo restante por la custodia (escrow).
      const { rows: [depositRow] } = await client.query(
        `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
         FROM wallet_holds
         WHERE auction_id = $1 AND status = 'APPLIED'`,
        [auctionId],
      );
      const appliedDepositCents = Number(depositRow.total ?? 0);
      const expectedCents = finalCents - appliedDepositCents;

      if (expectedCents !== amountCents) {
        throw new AppError({
          code: 'AMOUNT_MISMATCH',
          message: `El monto exacto a pagar es ${(expectedCents / 100).toFixed(2)} ${currency}${appliedDepositCents > 0 ? ` (${(appliedDepositCents / 100).toFixed(2)} de depósito ya abonado)` : ''}`,
          status: 422,
          details: { expectedCents, receivedCents: amountCents, appliedDepositCents },
        });
      }

      const existing = await client.query(
        `SELECT id FROM transacciones
         WHERE auction_id = $1 AND type = 'PAYMENT'
           AND status NOT IN ('REFUNDED', 'CANCELLED')
         FOR UPDATE`,
        [auctionId],
      );
      if (existing.rows.length > 0) {
        throw new AppError({
          code: 'PAYMENT_ALREADY_EXISTS',
          message: 'Ya existe un pago en custodia para esta subasta',
          status: 409,
        });
      }

      // 2) Cobro al comprador vía pasarela (idempotente por referencia).
      const charge = await this.provider.charge({
        amountCents,
        currency,
        sourceToken,
        idempotencyKey,
        reference: `auction_${auctionId}`,
      });

      // 3) Registro del pago en HOLD_ESCROW. amount = saldo restante;
      //    gross = precio final completo (sobre el que se calcula la comisión).
      const { rows: [transaction] } = await client.query(
        `INSERT INTO transacciones (
           idempotency_key, auction_id, buyer_id, seller_id, type, status,
           currency, amount_cents, gross_amount_cents, provider,
           provider_reference, escrow_status, metadata
         )
         VALUES ($1, $2, $3, $4, 'PAYMENT', 'HOLD_ESCROW', $5, $6, $7, $8, $9, 'FUNDED', $10)
         RETURNING id, auction_id, buyer_id, seller_id, status, currency,
                   amount_cents, gross_amount_cents, provider_reference, created_at`,
        [
          idempotencyKey,
          auctionId,
          buyerId,
          auction.seller_id,
          currency,
          amountCents,
          finalCents,
          this.provider.name,
          charge.providerReference,
          JSON.stringify({ flow: 'STANDARD', appliedDepositCents }),
        ],
      );

      // 4) Abono a la cuenta puente de custodia.
      await creditEscrowAccount(client, {
        userId: buyerId,
        provider: this.provider.name,
        amountCents,
        auctionId,
      });

      await client.query('COMMIT');
      return transaction;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 2) Libera el escrow: descuenta comisión, transfiere el neto al vendedor
   *    y marca la transacción COMPLETED. Solo si el comprador confirmó la
   *    entrega dentro de las 48 horas y no hay disputa.
   */
  async releaseEscrowPayment({ transactionId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [transaction] } = await client.query(
        'SELECT * FROM transacciones WHERE id = $1 FOR UPDATE',
        [transactionId],
      );
      if (!transaction) {
        throw new AppError({
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transacción no encontrada',
          status: 404,
        });
      }
      if (transaction.type !== 'PAYMENT' || transaction.status !== 'HOLD_ESCROW') {
        throw new AppError({
          code: 'INVALID_TRANSACTION_STATE',
          message: `La transacción no está lista para liberarse (estado: ${transaction.status})`,
          status: 409,
        });
      }

      // Confirmación de entrega dentro de la ventana de 48h.
      const { rows: [delivery] } = await client.query(
        'SELECT * FROM delivery_confirmations WHERE auction_id = $1',
        [transaction.auction_id],
      );
      if (delivery?.dispute_opened) {
        await client.query(
          `UPDATE transacciones
           SET status = 'DISPUTED', updated_at = now()
           WHERE id = $1`,
          [transaction.id],
        );
        await client.query('COMMIT');
        return {
          transactionId: transaction.id,
          status: 'DISPUTED',
          message: 'Disputa activa: fondos congelados hasta intervención de soporte',
        };
      }
      assertBuyerConfirmedWithinWindow(delivery);

      // Comisión según categoría del producto (8% estándar).
      const { rows: [auction] } = await client.query(
        'SELECT flow FROM auctions WHERE id = $1',
        [transaction.auction_id],
      );
      const { rows: [productCategory] } = await client.query(
        `SELECT c.type
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id = (SELECT product_id FROM auctions WHERE id = $1)`,
        [transaction.auction_id],
      );
      const categoryType = productCategory?.type ?? 'CACHIVACHES';

      const breakdown = await this.commissionService.computeSaleCommission({
        categoryType,
        finalAmountCents: transaction.gross_amount_cents,
        currency: transaction.currency,
      });

      // Registro de comisión dentro de la misma transacción de BD.
      await this.commissionService.recordSaleCommission({
        client,
        auctionId: transaction.auction_id,
        sellerId: transaction.seller_id,
        categoryType,
        currency: transaction.currency,
        grossAmountCents: transaction.gross_amount_cents,
        breakdown,
        transactionId: transaction.id,
      });

      // Pago del neto al vendedor vía pasarela. El escrow solo contiene el
      // saldo restante (el depósito ya se entregó como DOWN_PAYMENT), así que
      // se paga: monto en custodia - comisión - impuestos.
      const feeCents =
        breakdown.commissionCents + breakdown.fixedFeeCents + breakdown.taxCents;
      const escrowPayoutCents = transaction.amount_cents - feeCents;
      if (escrowPayoutCents < 0) {
        throw new AppError({
          code: 'ESCROW_PAYOUT_NEGATIVE',
          message: 'Los cargos superan el monto en custodia; se requiere intervención',
          status: 409,
        });
      }

      const payout = await this.provider.payout({
        amountCents: escrowPayoutCents,
        currency: transaction.currency,
        destinationAccountId: `seller_${transaction.seller_id}`,
        reference: `escrow_${transaction.id}`,
      });

      const { rows: [updated] } = await client.query(
        `UPDATE transacciones
         SET status = 'COMPLETED',
             commission_cents = $2,
             tax_cents = $3,
             net_to_seller_cents = $4,
             provider_reference = $5,
             escrow_status = 'RELEASED_TO_SELLER',
             released_at = now(),
             updated_at = now()
         WHERE id = $1
         RETURNING id, status, gross_amount_cents, commission_cents,
                   tax_cents, net_to_seller_cents, released_at`,
        [
          transaction.id,
          breakdown.commissionCents + breakdown.fixedFeeCents,
          breakdown.taxCents,
          escrowPayoutCents,
          payout.providerReference,
        ],
      );

      // Movimientos contables: se debita la custodia del comprador y se
      // abona la cuenta del vendedor.
      await debitEscrowAccount(client, {
        userId: transaction.buyer_id,
        provider: this.provider.name,
        amountCents: transaction.amount_cents,
        auctionId: transaction.auction_id,
      });
      await creditEscrowAccount(client, {
        userId: transaction.seller_id,
        provider: 'PAYOUT',
        amountCents: escrowPayoutCents,
        auctionId: transaction.auction_id,
      });

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Congela los fondos (HOLD_ESCROW -> DISPUTED) hasta que soporte decida. */
  async openDispute({ transactionId, reason }) {
    const { rows: [transaction] } = await this.pool.query(
      `UPDATE transacciones
       SET status = 'DISPUTED', metadata = metadata || $2::jsonb, updated_at = now()
       WHERE id = $1 AND status = 'HOLD_ESCROW'
       RETURNING id, status`,
      [transactionId, JSON.stringify({ dispute: { reason, openedAt: new Date().toISOString() } })],
    );
    if (!transaction) {
      throw new AppError({
        code: 'CANNOT_DISPUTE',
        message: 'La transacción no está en custodia o no existe',
        status: 409,
      });
    }
    return transaction;
  }

  /** Reembolso total al comprador (liberación de custodia a favor del comprador). */
  async refundPayment({ transactionId, reason }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [transaction] } = await client.query(
        'SELECT * FROM transacciones WHERE id = $1 FOR UPDATE',
        [transactionId],
      );
      if (!transaction) {
        throw new AppError({
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transacción no encontrada',
          status: 404,
        });
      }
      if (!['HOLD_ESCROW', 'DISPUTED'].includes(transaction.status)) {
        throw new AppError({
          code: 'INVALID_TRANSACTION_STATE',
          message: 'La transacción no puede reembolsarse',
          status: 409,
        });
      }

      await this.provider.refund({
        providerReference: transaction.provider_reference,
        amountCents: transaction.amount_cents,
        reason,
      });

      await client.query(
        `UPDATE transacciones
         SET status = 'REFUNDED',
             escrow_status = 'REFUNDED_TO_BUYER',
             metadata = metadata || $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [transaction.id, JSON.stringify({ refund: { reason, at: new Date().toISOString() } })],
      );
      await debitEscrowAccount(client, {
        userId: transaction.buyer_id,
        provider: this.provider.name,
        amountCents: transaction.amount_cents,
        auctionId: transaction.auction_id,
      });

      await client.query('COMMIT');
      return { transactionId: transaction.id, status: 'REFUNDED' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
