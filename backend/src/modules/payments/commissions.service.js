import { AppError } from '../../utils/errors.js';
import { roundCents } from '../../utils/money.js';

/**
 * Modelo de comisiones de Martillazo.
 *
 *  - CACHIVACHES (Estándar): 8% sobre el valor final, pagado por el vendedor
 *    al completarse la venta.
 *  - BIENES_RAICES (Alto valor): $50 USD fijos por publicar (validación SUNARP)
 *    + 1.5% sobre el valor final de venta, con tope de $3,000 USD.
 *
 * Las reglas viven en la tabla `commission_rules` (data-driven). Todos los
 * montos se calculan en unidades menores (céntimos).
 */
export class CommissionService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async getRule(categoryType) {
    const { rows: [rule] } = await this.pool.query(
      `SELECT * FROM commission_rules
       WHERE category_type = $1 AND is_active = TRUE`,
      [categoryType],
    );
    if (!rule) {
      throw new AppError({
        code: 'COMMISSION_RULE_NOT_FOUND',
        message: `No existe regla de comisión para la categoría ${categoryType}`,
        status: 500,
      });
    }
    return rule;
  }

  /**
   * Calcula el desglose de comisión sobre la venta final.
   * NOTA: el tope ($3,000 USD) se aplica sobre la comisión en la misma moneda
   * de la transacción; en producción convierta el tope por tipo de cambio
   * vigente antes de comparar.
   */
  async computeSaleCommission({ categoryType, finalAmountCents, currency = 'PEN' }) {
    const rule = await this.getRule(categoryType);
    const rate = Number(rule.rate);

    let commissionCents = roundCents(finalAmountCents * rate);
    let appliedCapCents = null;

    if (rule.cap_cents && commissionCents > Number(rule.cap_cents)) {
      commissionCents = Number(rule.cap_cents);
      appliedCapCents = commissionCents;
    }

    const fixedFeeCents = Number(rule.fixed_fee_cents ?? 0);
    const totalCommissionCents = commissionCents + fixedFeeCents;
    const taxRate = Number(rule.tax_rate ?? 0);
    const taxCents = roundCents(totalCommissionCents * taxRate);
    const totalChargedCents = totalCommissionCents + taxCents;
    const netToSellerCents = finalAmountCents - totalChargedCents;

    if (netToSellerCents < 0) {
      throw new AppError({
        code: 'COMMISSION_EXCEEDS_AMOUNT',
        message: 'La comisión supera el valor de la venta',
        status: 422,
      });
    }

    return {
      currency,
      rate,
      grossAmountCents: finalAmountCents,
      commissionCents,
      fixedFeeCents,
      appliedCapCents,
      taxRate,
      taxCents,
      totalChargedCents,
      netToSellerCents,
    };
  }

  /**
   * Persiste el registro de comisión. Recibe `client` para ejecutarse dentro
   * de la misma transacción que libera el escrow (consistencia total).
   */
  async recordSaleCommission({
    client,
    auctionId,
    sellerId,
    categoryType,
    currency,
    grossAmountCents,
    breakdown,
    transactionId,
  }) {
    const { rows: [commission] } = await client.query(
      `INSERT INTO comisiones (
         transaction_id, auction_id, seller_id, category_type, currency,
         gross_amount_cents, commission_rate, commission_cents, fixed_fee_cents,
         cap_cents, tax_rate, tax_cents, total_charged_cents,
         net_to_seller_cents, status, charged_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'COMPLETED', now())
       RETURNING id, auction_id, seller_id, gross_amount_cents, commission_cents,
                 fixed_fee_cents, tax_cents, total_charged_cents, net_to_seller_cents`,
      [
        transactionId,
        auctionId,
        sellerId,
        categoryType,
        currency,
        grossAmountCents,
        breakdown.rate,
        breakdown.commissionCents,
        breakdown.fixedFeeCents,
        breakdown.appliedCapCents,
        breakdown.taxRate,
        breakdown.taxCents,
        breakdown.totalChargedCents,
        breakdown.netToSellerCents,
      ],
    );
    return commission;
  }

  /**
   * Tarifa de publicación premium: $50 USD por gastos de validación SUNARP.
   * Se cobra al vendedor al momento de publicar.
   */
  async chargePublicationFee({ auctionId, sellerId, sourceToken, currency = 'USD' }) {
    const { rows: [auction] } = await this.pool.query(
      'SELECT flow FROM auctions WHERE id = $1',
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
        code: 'PUBLICATION_FEE_PREMIUM_ONLY',
        message: 'La tarifa de publicación solo aplica al flujo PREMIUM',
        status: 422,
      });
    }

    const rule = await this.getRule('BIENES_RAICES');
    const fixedFeeCents = Number(rule.fixed_fee_cents ?? 0);

    // Aquí se invocaría provider.charge(...) con el token del vendedor.
    const result = await this.pool.query(
      `INSERT INTO comisiones (
         auction_id, seller_id, category_type, currency, gross_amount_cents,
         commission_rate, commission_cents, fixed_fee_cents, cap_cents,
         tax_rate, tax_cents, total_charged_cents, net_to_seller_cents,
         status, charged_at
       )
       VALUES ($1, $2, 'BIENES_RAICES', $3, 0, 0, 0, $4, NULL, 0, 0, $4, 0, 'COMPLETED', now())
       RETURNING id, fixed_fee_cents, total_charged_cents`,
      [auctionId, sellerId, currency, fixedFeeCents],
    );

    return result.rows[0];
  }
}
