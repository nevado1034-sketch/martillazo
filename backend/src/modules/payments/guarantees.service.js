import { AppError } from '../../utils/errors.js';
import { toMinorUnits } from '../../utils/money.js';

/**
 * Reglas de garantía de puja para bienes de alto valor (PREMIUM).
 * El monto se calcula como un porcentaje del precio base, con piso y tope.
 * Ejemplos: S/ 1,000 (piso) o $300 USD según la categoría.
 */
const GUARANTEE_RULES = {
  BIENES_RAICES: {
    currency: 'PEN',
    floorCents: 100_000,      // S/ 1,000.00
    percent: 0.05,            // 5% del precio base
    capCents: 2_000_000,      // S/ 20,000.00
  },
};

/** Plazo fijo para firmar la escritura (15 días) antes de cobrar la penalidad. */
const NOTARY_SIGNING_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

/** Depósito fijo que habilita la puja en el flujo STANDARD (S/10). */
export const STANDARD_BID_DEPOSIT_CENTS = 1000;

export function computeGuaranteeAmount(categoryType, startingPriceCents) {
  const rule = GUARANTEE_RULES[categoryType];
  if (!rule) {
    throw new AppError({
      code: 'NO_GUARANTEE_RULE',
      message: `No existe regla de garantía para ${categoryType}`,
      status: 422,
    });
  }
  const percentCents = Math.round(startingPriceCents * rule.percent);
  return Math.min(Math.max(percentCents, rule.floorCents), rule.capCents);
}

/**
 * Garantía de puja según flujo:
 *  - PREMIUM: regla de alto valor (5%, piso S/1,000, tope S/20,000).
 *  - STANDARD: depósito fijo de S/10 vía billetera (Yape/Plin/tarjeta).
 */
export function computeBidGuaranteeCents({ flow, categoryType, startingPriceCents }) {
  if (flow === 'PREMIUM') {
    return computeGuaranteeAmount(categoryType ?? 'BIENES_RAICES', startingPriceCents);
  }
  return STANDARD_BID_DEPOSIT_CENTS;
}

/**
 * Sistema de garantía de puja (inmuebles/autos).
 *
 *  - holdAuctionGuarantee: pre-autorización (hold) en la tarjeta del postor.
 *  - releaseGuarantee: el postor pierde -> liberación inmediata sin cargos.
 *  - applyToDownPayment: gana y firma -> la garantía se abona al pago inicial.
 *  - chargePenalty: gana pero no firma en el plazo -> cobro total como
 *    penalidad, repartida 50% vendedor / 50% plataforma.
 */
export class GuaranteeService {
  constructor({ pool, provider }) {
    this.pool = pool;
    this.provider = provider;
  }

  /** Pre-autoriza la tarjeta del postor para habilitar la puja en PREMIUM. */
  async holdAuctionGuarantee({ userId, auctionId, paymentMethodId, amount, currency = 'PEN' }) {
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
      if (auction.flow !== 'PREMIUM') {
        throw new AppError({
          code: 'FLOW_NOT_SUPPORTED',
          message: 'La garantía de puja solo aplica a inmuebles y autos',
          status: 422,
        });
      }
      if (auction.status !== 'ACTIVE') {
        throw new AppError({
          code: 'AUCTION_NOT_ACTIVE',
          message: 'La subasta no está activa',
          status: 409,
        });
      }

      // KYC estricto (DNI/CE + biometría) es requisito del flujo PREMIUM.
      const { rows: [kyc] } = await client.query(
        `SELECT status FROM kyc_verifications
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      if (!kyc || kyc.status !== 'VERIFIED') {
        throw new AppError({
          code: 'KYC_REQUIRED',
          message: 'Debes completar la verificación KYC para pujar en bienes raíces',
          status: 403,
        });
      }

      const { rows: [method] } = await client.query(
        `SELECT * FROM payment_methods
         WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
        [paymentMethodId, userId],
      );
      if (!method) {
        throw new AppError({
          code: 'PAYMENT_METHOD_NOT_FOUND',
          message: 'Tarjeta de crédito no registrada o inactiva',
          status: 404,
        });
      }

      // Monto: el explícito de la petición o el calculado por regla.
      const startingPriceCents = Math.round(Number(auction.starting_price) * 100);
      const amountCents = amount
        ? toMinorUnits(amount, currency)
        : computeGuaranteeAmount('BIENES_RAICES', startingPriceCents);
      const holdCurrency = amount ? currency : GUARANTEE_RULES.BIENES_RAICES.currency;

      // Pre-autorización (hold) — nunca debita en este punto.
      const authorization = await this.provider.authorize({
        amountCents,
        currency: holdCurrency,
        cardToken: method.provider_token,
        reference: `hold_auction_${auctionId}_user_${userId}`,
      });

      const { rows: [hold] } = await client.query(
        `INSERT INTO guarantee_holds (
           user_id, auction_id, card_brand, masked_card_number,
           authorization_code, amount, currency, status, authorized_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'HELD', now())
         RETURNING id, user_id, auction_id, amount, currency, authorization_code, status`,
        [
          userId,
          auctionId,
          method.card_brand,
          method.masked_number,
          authorization.authorizationCode,
          amountCents,
          holdCurrency,
        ],
      );

      await client.query('COMMIT');
      return hold;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** El postor perdió la subasta -> liberación inmediata, sin cargos. */
  async releaseGuarantee({ holdId, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [hold] } = await client.query(
        'SELECT * FROM guarantee_holds WHERE id = $1 FOR UPDATE',
        [holdId],
      );
      if (!hold) {
        throw new AppError({
          code: 'GUARANTEE_HOLD_NOT_FOUND',
          message: 'Retención no encontrada',
          status: 404,
        });
      }
      if (hold.user_id !== userId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a esta retención',
          status: 403,
        });
      }
      if (hold.status !== 'HELD') {
        throw new AppError({
          code: 'GUARANTEE_NOT_HELD',
          message: `La retención no está activa (estado: ${hold.status})`,
          status: 409,
        });
      }

      await this.provider.releaseAuthorization({
        authorizationCode: hold.authorization_code,
      });

      const { rows: [updated] } = await client.query(
        `UPDATE guarantee_holds
         SET status = 'RELEASED', outcome = 'LOST', released_at = now()
         WHERE id = $1
         RETURNING id, status, outcome, amount, currency`,
        [holdId],
      );

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** El ganador firmó la escritura -> la garantía se captura y abona al pago inicial. */
  async applyToDownPayment({ holdId, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [hold] } = await client.query(
        'SELECT * FROM guarantee_holds WHERE id = $1 FOR UPDATE',
        [holdId],
      );
      if (!hold) {
        throw new AppError({
          code: 'GUARANTEE_HOLD_NOT_FOUND',
          message: 'Retención no encontrada',
          status: 404,
        });
      }
      if (hold.user_id !== userId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a esta retención',
          status: 403,
        });
      }
      if (hold.status !== 'HELD') {
        throw new AppError({
          code: 'GUARANTEE_NOT_HELD',
          message: `La retención no está activa (estado: ${hold.status})`,
          status: 409,
        });
      }

      const { rows: [auction] } = await client.query(
        'SELECT winner_id, seller_id, status FROM auctions WHERE id = $1',
        [hold.auction_id],
      );
      if (!auction || auction.winner_id !== userId) {
        throw new AppError({
          code: 'NOT_THE_WINNER',
          message: 'Solo el ganador puede abonar la garantía al pago inicial',
          status: 403,
        });
      }

      const { rows: [closure] } = await client.query(
        'SELECT signed_at FROM notarial_closures WHERE auction_id = $1',
        [hold.auction_id],
      );
      if (!closure?.signed_at) {
        throw new AppError({
          code: 'NOTARY_NOT_SIGNED',
          message: 'La escritura aún no está firmada',
          status: 409,
        });
      }

      // Captura definitiva (debita).
      const capture = await this.provider.capture({
        authorizationCode: hold.authorization_code,
        amountCents: hold.amount,
      });

      const { rows: [transaction] } = await client.query(
        `INSERT INTO transacciones (
           auction_id, buyer_id, seller_id, type, status, currency,
           amount_cents, gross_amount_cents, provider, provider_reference, metadata
         )
         VALUES ($1, $2, $3, 'DOWN_PAYMENT', 'COMPLETED', $4, $5, $5, $6, $7, $8)
         RETURNING id, type, status, amount_cents`,
        [
          hold.auction_id,
          hold.user_id,
          auction.seller_id,
          hold.currency,
          hold.amount,
          this.provider.name,
          capture.providerReference,
          JSON.stringify({ guaranteeHoldId: hold.id, appliedToDownPayment: true }),
        ],
      );

      const { rows: [updated] } = await client.query(
        `UPDATE guarantee_holds
         SET status = 'RELEASED', outcome = 'APPLIED', captured_at = now(),
             applied_to_down_payment = TRUE
         WHERE id = $1
         RETURNING id, status, outcome, amount, currency`,
        [holdId],
      );

      await client.query('COMMIT');
      return { hold: updated, transaction };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * El ganador no firmó dentro del plazo (15 días desde el cierre notarial):
   * la plataforma cobra la garantía completa como penalidad y la reparte
   * 50% al vendedor y 50% a la plataforma.
   */
  async chargePenalty({ holdId, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [hold] } = await client.query(
        'SELECT * FROM guarantee_holds WHERE id = $1 FOR UPDATE',
        [holdId],
      );
      if (!hold) {
        throw new AppError({
          code: 'GUARANTEE_HOLD_NOT_FOUND',
          message: 'Retención no encontrada',
          status: 404,
        });
      }
      if (hold.user_id !== userId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a esta retención',
          status: 403,
        });
      }
      if (hold.status !== 'HELD') {
        throw new AppError({
          code: 'GUARANTEE_NOT_HELD',
          message: `La retención no está activa (estado: ${hold.status})`,
          status: 409,
        });
      }

      const { rows: [auction] } = await client.query(
        'SELECT winner_id, seller_id FROM auctions WHERE id = $1',
        [hold.auction_id],
      );
      if (!auction || auction.winner_id !== userId) {
        throw new AppError({
          code: 'NOT_THE_WINNER',
          message: 'La penalidad solo aplica al ganador que no firmó',
          status: 403,
        });
      }

      const { rows: [closure] } = await client.query(
        'SELECT deadline, signed_at FROM notarial_closures WHERE auction_id = $1',
        [hold.auction_id],
      );
      if (!closure) {
        throw new AppError({
          code: 'NOTARY_CLOSURE_NOT_FOUND',
          message: 'No existe cierre notarial para esta subasta',
          status: 409,
        });
      }
      if (closure.signed_at) {
        throw new AppError({
          code: 'NOTARY_ALREADY_SIGNED',
          message: 'La escritura ya fue firmada',
          status: 409,
        });
      }
      if (Date.now() < new Date(closure.deadline).getTime() + NOTARY_SIGNING_WINDOW_MS) {
        throw new AppError({
          code: 'PENALTY_NOT_DUE',
          message: 'El plazo de 15 días para firmar la escritura aún no vence',
          status: 409,
        });
      }

      // Captura de la garantía completa como penalidad.
      const capture = await this.provider.capture({
        authorizationCode: hold.authorization_code,
        amountCents: hold.amount,
      });

      // Reparto 50/50.
      const sellerShareCents = Math.floor(hold.amount / 2);
      const platformShareCents = hold.amount - sellerShareCents;

      const insertPenalty = (role, amountCents) =>
        client.query(
          `INSERT INTO transacciones (
             auction_id, buyer_id, seller_id, type, status, currency,
             amount_cents, gross_amount_cents, provider, provider_reference, metadata
           )
           VALUES ($1, $2, $3, 'PENALTY', 'COMPLETED', $4, $5, $5, $6, $7, $8)
           RETURNING id, type, amount_cents`,
          [
            hold.auction_id,
            hold.user_id,
            auction.seller_id,
            hold.currency,
            amountCents,
            this.provider.name,
            capture.providerReference,
            JSON.stringify({ role, guaranteeHoldId: hold.id }),
          ],
        );

      const [sellerTxn, platformTxn] = await Promise.all([
        insertPenalty('SELLER_SHARE', sellerShareCents),
        insertPenalty('PLATFORM_SHARE', platformShareCents),
      ]);

      const { rows: [updated] } = await client.query(
        `UPDATE guarantee_holds
         SET status = 'PENALTY_CHARGED', outcome = 'PENALTY', captured_at = now(),
             penalty_split = $2
         WHERE id = $1
         RETURNING id, status, outcome, amount, currency, penalty_split`,
        [
          holdId,
          JSON.stringify({
            sellerShareCents,
            platformShareCents,
            sellerTransactionId: sellerTxn.rows[0].id,
            platformTransactionId: platformTxn.rows[0].id,
          }),
        ],
      );

      await client.query('COMMIT');
      return {
        hold: updated,
        split: { sellerShareCents, platformShareCents },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
