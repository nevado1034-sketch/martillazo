import { AppError } from '../../utils/errors.js';
import { toMinorUnits } from '../../utils/money.js';

const VALID_METHODS = ['YAPE', 'PLIN', 'CARD'];

/**
 * Billetera (Yape/Plin/Tarjeta) para montos pequeños.
 *
 *  - topup: recarga por Yape/Plin (con código de operación) o tarjeta.
 *  - holdForBid: retiene el depósito que habilita la puja (S/10 en STANDARD).
 *  - resolveAuctionHolds: al adjudicar, el ganador ve su depósito aplicado al
 *    pago final (DOWN_PAYMENT al vendedor) y los perdedores recuperan saldo.
 *  - releaseAllHolds: subasta sin ganador -> se libera todo.
 *  - chargePenalty: el ganador que no paga pierde el depósito (50/50).
 *
 * Contabilidad: la retención NO mueve dinero; solo bloquea disponibilidad
 * (balance - retenciones activas). El dinero se descuenta al aplicar el
 * depósito o cobrar la penalidad.
 */
export class WalletService {
  constructor({ pool, provider }) {
    this.pool = pool;
    this.provider = provider;
  }

  async #getWallet(client, userId, currency = 'PEN') {
    const { rows: [existing] } = await client.query(
      `SELECT * FROM wallet_accounts
       WHERE user_id = $1 AND currency = $2
       FOR UPDATE`,
      [userId, currency],
    );
    if (existing) return existing;
    const { rows: [created] } = await client.query(
      `INSERT INTO wallet_accounts (user_id, currency)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, currency],
    );
    return created;
  }

  async #activeHoldsCents(client, userId) {
    const { rows: [row] } = await client.query(
      `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
       FROM wallet_holds
       WHERE user_id = $1 AND status = 'HELD'`,
      [userId],
    );
    return Number(row.total);
  }

  /** Estado de la billetera: saldo, retenciones y últimos movimientos. */
  async getState(userId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wallet = await this.#getWallet(client, userId);
      const heldCents = await this.#activeHoldsCents(client, userId);
      const { rows: transactions } = await client.query(
        `SELECT id, type, status, amount_cents, currency, method,
                provider_reference, auction_id, created_at
         FROM wallet_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 12`,
        [userId],
      );
      await client.query('COMMIT');
      return {
        walletId: wallet.id,
        currency: wallet.currency,
        balanceCents: Number(wallet.balance_cents),
        heldCents,
        availableCents: Number(wallet.balance_cents) - heldCents,
        transactions,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Recarga la billetera.
   *  - YAPE / PLIN: verificación simulada del código de operación.
   *  - CARD: cobro vía pasarela (mock en desarrollo).
   */
  async topup({ userId, amount, currency = 'PEN', method, referenceCode }) {
    const amountCents = toMinorUnits(amount, currency);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new AppError({
        code: 'INVALID_AMOUNT',
        message: 'Ingresa un monto válido para recargar',
        status: 422,
      });
    }
    const normalizedMethod = String(method ?? '').toUpperCase();
    if (!VALID_METHODS.includes(normalizedMethod)) {
      throw new AppError({
        code: 'INVALID_METHOD',
        message: 'Método no soportado (usa YAPE, PLIN o CARD)',
        status: 422,
      });
    }
    if (normalizedMethod !== 'CARD' && !referenceCode) {
      throw new AppError({
        code: 'REFERENCE_REQUIRED',
        message: 'Pega el código de operación de tu Yape o Plin',
        status: 422,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wallet = await this.#getWallet(client, userId, currency);

      let providerReference;
      let metadata;
      if (normalizedMethod === 'CARD') {
        const charge = await this.provider.charge({
          amountCents,
          currency,
          sourceToken: referenceCode ?? 'tok_mock',
          idempotencyKey: `wallet_topup_${userId}_${Date.now()}`,
          reference: `wallet_topup_${userId}`,
        });
        providerReference = charge.providerReference;
        metadata = { referenceCode: referenceCode ?? null };
      } else {
        providerReference = `bk_${normalizedMethod.toLowerCase()}_${String(
          referenceCode,
        ).slice(0, 24)}`;
        metadata = {
          referenceCode,
          simulatedVerification: true,
        };
      }

      await client.query(
        `UPDATE wallet_accounts
         SET balance_cents = balance_cents + $1
         WHERE id = $2`,
        [amountCents, wallet.id],
      );

      const { rows: [txn] } = await client.query(
        `INSERT INTO wallet_transactions (
           user_id, type, status, amount_cents, currency, method,
           provider_reference, metadata
         )
         VALUES ($1, 'TOPUP', 'COMPLETED', $2, $3, $4, $5, $6)
         RETURNING id, type, status, amount_cents, currency, method,
                   provider_reference, created_at`,
        [
          userId,
          amountCents,
          currency,
          normalizedMethod,
          providerReference,
          JSON.stringify(metadata),
        ],
      );

      const heldCents = await this.#activeHoldsCents(client, userId);
      await client.query('COMMIT');
      return {
        transaction: txn,
        balanceCents: Number(wallet.balance_cents) + amountCents,
        heldCents,
        availableCents: Number(wallet.balance_cents) + amountCents - heldCents,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retención de garantía antes de pujar. Se ejecuta DENTRO de la transacción
   * de la puja. Si el saldo disponible no alcanza, rechaza la puja.
   */
  async holdForBid({ client, userId, auctionId, amountCents, currency = 'PEN' }) {
    const wallet = await this.#getWallet(client, userId, currency);
    const heldCents = await this.#activeHoldsCents(client, userId);
    const availableCents = Number(wallet.balance_cents) - heldCents;
    if (availableCents < amountCents) {
      throw new AppError({
        code: 'WALLET_INSUFFICIENT',
        message: `Saldo insuficiente en tu billetera. Necesitas S/ ${(
          amountCents / 100
        ).toFixed(2)} disponibles para pujar. Recarga en “Mi cuenta”.`,
        status: 402,
        details: { requiredCents: amountCents, availableCents },
      });
    }
    await client.query(
      `INSERT INTO wallet_holds (user_id, auction_id, amount_cents, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, auction_id) WHERE status = 'HELD' DO NOTHING`,
      [userId, auctionId, amountCents, currency],
    );
    return { amountCents, availableCents: availableCents - amountCents };
  }

  /**
   * Cierre de subasta adjudicada: el depósito del ganador se aplica al pago
   * final (se descuenta del saldo y se registra como DOWN_PAYMENT al vendedor);
   * los demás postores recuperan su disponibilidad (RELEASED).
   */
  async resolveAuctionHolds({ client, auctionId, winnerId, sellerId }) {
    const { rows: holds } = await client.query(
      `SELECT id, user_id, amount_cents, currency
       FROM wallet_holds
       WHERE auction_id = $1 AND status = 'HELD'`,
      [auctionId],
    );
    if (holds.length === 0) return { applied: 0, released: 0 };

    let applied = 0;
    let released = 0;
    for (const hold of holds) {
      if (hold.user_id === winnerId) {
        await client.query(
          `UPDATE wallet_accounts
           SET balance_cents = balance_cents - $1
           WHERE user_id = $2`,
          [hold.amount_cents, hold.user_id],
        );
        await client.query(
          `UPDATE wallet_holds
           SET status = 'APPLIED', resolved_at = now()
           WHERE id = $1`,
          [hold.id],
        );
        await client.query(
          `INSERT INTO wallet_transactions (
             user_id, type, status, amount_cents, currency, method,
             auction_id, metadata
           )
           VALUES ($1, 'APPLIED', 'COMPLETED', $2, $3, 'WALLET', $4, $5)`,
          [
            hold.user_id,
            hold.amount_cents,
            hold.currency,
            auctionId,
            JSON.stringify({ reason: 'WINNING_BID_DEPOSIT' }),
          ],
        );
        await client.query(
          `INSERT INTO transacciones (
             auction_id, buyer_id, seller_id, type, status, currency,
             amount_cents, gross_amount_cents, provider, metadata
           )
           VALUES ($1, $2, $3, 'DOWN_PAYMENT', 'COMPLETED', $4, $5, $5, 'WALLET', $6)`,
          [
            auctionId,
            hold.user_id,
            sellerId,
            hold.currency,
            hold.amount_cents,
            JSON.stringify({ walletHoldId: hold.id, appliedToDownPayment: true }),
          ],
        );
        applied += 1;
      } else {
        await client.query(
          `UPDATE wallet_holds
           SET status = 'RELEASED', resolved_at = now()
           WHERE id = $1`,
          [hold.id],
        );
        released += 1;
      }
    }
    return { applied, released };
  }

  /** Subasta sin ganador (EXPIRED): libera todas las retenciones. */
  async releaseAllHolds({ client, auctionId }) {
    const { rows } = await client.query(
      `UPDATE wallet_holds
       SET status = 'RELEASED', resolved_at = now()
       WHERE auction_id = $1 AND status = 'HELD'`,
      [auctionId],
    );
    return { released: rows.rowCount ?? 0 };
  }

  /**
   * El ganador no pagó a tiempo: el depósito ya estaba descontado al aplicarse,
   * se re-etiqueta como penalidad y se registra la parte del vendedor (50%).
   */
  async chargePenalty({ client, auctionId, winnerId, sellerId }) {
    const { rows: holds } = await client.query(
      `SELECT id, amount_cents, currency
       FROM wallet_holds
       WHERE auction_id = $1 AND user_id = $2 AND status = 'APPLIED'`,
      [auctionId, winnerId],
    );
    let charged = 0;
    for (const hold of holds) {
      await client.query(
        `UPDATE wallet_holds
         SET status = 'PENALTY', resolved_at = now()
         WHERE id = $1`,
        [hold.id],
      );
      await client.query(
        `INSERT INTO wallet_transactions (
           user_id, type, status, amount_cents, currency, method, auction_id
         )
         VALUES ($1, 'PENALTY', 'COMPLETED', $2, $3, 'WALLET', $4)`,
        [winnerId, hold.amount_cents, hold.currency, auctionId],
      );
      const sellerShareCents = Math.floor(hold.amount_cents / 2);
      await client.query(
        `INSERT INTO transacciones (
           auction_id, buyer_id, seller_id, type, status, currency,
           amount_cents, gross_amount_cents, provider, metadata
         )
         VALUES ($1, $2, $3, 'PENALTY', 'COMPLETED', $4, $5, $5, 'WALLET', $6)`,
        [
          auctionId,
          winnerId,
          sellerId,
          hold.currency,
          sellerShareCents,
          JSON.stringify({ role: 'SELLER_SHARE', walletHoldId: hold.id }),
        ],
      );
      charged += 1;
    }
    return { charged };
  }

  /** Depósito aplicado de la subasta (para descontarlo del pago final). */
  async getAppliedDepositCents(auctionId) {
    const { rows: [row] } = await this.pool.query(
      `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
       FROM wallet_holds
       WHERE auction_id = $1 AND status = 'APPLIED'`,
      [auctionId],
    );
    return Number(row.total);
  }
}
