import { AppError } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { SandboxEscrowProvider } from './sandbox.provider.js';

const HOLD_HOURS = 24;

function solesToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Importe inválido',
      status: 422,
    });
  }
  return Math.round(n * 100);
}

function centsToSoles(cents) {
  return Number(cents) / 100;
}

function commissionParts(amountCents) {
  const percent = Number(env.pulgasyaCommissionPercent ?? 10);
  const rate = Number.isFinite(percent) && percent >= 0 ? percent : 10;
  const commissionCents = Math.round((amountCents * rate) / 100);
  const netToSellerCents = Math.max(0, amountCents - commissionCents);
  return { commissionPercent: rate, commissionCents, netToSellerCents };
}

function mapOrder(row) {
  if (!row) return null;
  const releaseDueAt = row.release_due_at ? new Date(row.release_due_at) : null;
  const now = Date.now();
  let autoReleaseSecondsLeft = null;
  if (row.status === 'delivered' && releaseDueAt) {
    autoReleaseSecondsLeft = Math.max(
      0,
      Math.floor((releaseDueAt.getTime() - now) / 1000),
    );
  }
  return {
    id: row.id,
    listingId: row.listing_id,
    offerId: row.offer_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: centsToSoles(row.amount_cents),
    amountCents: Number(row.amount_cents),
    currency: row.currency || 'PEN',
    commissionPercent: Number(row.commission_percent),
    commissionAmount: centsToSoles(row.commission_cents),
    commissionCents: Number(row.commission_cents),
    netToSeller: centsToSoles(row.net_to_seller_cents),
    netToSellerCents: Number(row.net_to_seller_cents),
    status: row.status,
    paymentProvider: row.payment_provider,
    paymentRef: row.payment_ref,
    sandboxLabel: row.sandbox_label,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    releaseDueAt: row.release_due_at,
    buyerConfirmedAt: row.buyer_confirmed_at,
    releasedAt: row.released_at,
    disputedAt: row.disputed_at,
    disputeReason: row.dispute_reason,
    refundedAt: row.refunded_at,
    mediationNote: row.mediation_note,
    createdAt: row.created_at,
    listingTitle: row.listing_title,
    listingType: row.listing_type,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
    autoReleaseSecondsLeft,
    escrowNote:
      'El pago está en custodia de PulgasYa. Se libera al vendedor (menos comisión) cuando confirmas o tras 24 h desde la entrega sin reclamo.',
  };
}

const ORDER_SELECT = `
  SELECT o.*,
         l.title AS listing_title,
         l.type AS listing_type,
         b.full_name AS buyer_name,
         s.full_name AS seller_name
  FROM pulgasya_orders o
  JOIN pulgasya_listings l ON l.id = o.listing_id
  JOIN users b ON b.id = o.buyer_id
  JOIN users s ON s.id = o.seller_id
`;

export class EscrowService {
  constructor({ pool, provider = new SandboxEscrowProvider() }) {
    this.pool = pool;
    this.provider = provider;
  }

  async #getOrderRow(id, client = this.pool) {
    const { rows: [row] } = await client.query(
      `${ORDER_SELECT} WHERE o.id = $1`,
      [id],
    );
    return row;
  }

  async getOrder(id, { userId } = {}) {
    const row = await this.#getOrderRow(id);
    if (!row) {
      throw new AppError({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado',
        status: 404,
      });
    }
    if (
      userId &&
      row.buyer_id !== userId &&
      row.seller_id !== userId
    ) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'No tienes acceso a este pedido',
        status: 403,
      });
    }
    return mapOrder(row);
  }

  async listForUser(userId, role = 'all') {
    const clauses = [];
    const params = [userId];
    if (role === 'buyer') clauses.push('o.buyer_id = $1');
    else if (role === 'seller') clauses.push('o.seller_id = $1');
    else clauses.push('(o.buyer_id = $1 OR o.seller_id = $1)');

    const { rows } = await this.pool.query(
      `${ORDER_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY o.created_at DESC
       LIMIT 100`,
      params,
    );
    return rows.map(mapOrder);
  }

  async createFromOffer({ offerId, actorId }) {
    const { rows: [offer] } = await this.pool.query(
      `SELECT o.*, l.seller_id, l.title, l.status AS listing_status
       FROM pulgasya_offers o
       JOIN pulgasya_listings l ON l.id = o.listing_id
       WHERE o.id = $1`,
      [offerId],
    );
    if (!offer) {
      throw new AppError({
        code: 'OFFER_NOT_FOUND',
        message: 'Oferta no encontrada',
        status: 404,
      });
    }
    if (offer.status !== 'aceptada') {
      throw new AppError({
        code: 'OFFER_NOT_ACCEPTED',
        message: 'Solo puedes pagar ofertas aceptadas',
        status: 422,
      });
    }
    if (offer.buyer_id !== actorId && offer.seller_id !== actorId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'No puedes crear este pedido',
        status: 403,
      });
    }

    const existing = await this.pool.query(
      `SELECT id FROM pulgasya_orders
       WHERE offer_id = $1 AND status NOT IN ('refunded')
       LIMIT 1`,
      [offerId],
    );
    if (existing.rows[0]) {
      return this.getOrder(existing.rows[0].id, { userId: actorId });
    }

    return this.#insertOrder({
      listingId: offer.listing_id,
      offerId: offer.id,
      buyerId: offer.buyer_id,
      sellerId: offer.seller_id,
      amountCents: solesToCents(offer.amount),
    });
  }

  async createBuyNow({ listingId, buyerId }) {
    const { rows: [listing] } = await this.pool.query(
      `SELECT * FROM pulgasya_listings WHERE id = $1`,
      [listingId],
    );
    if (!listing) {
      throw new AppError({
        code: 'LISTING_NOT_FOUND',
        message: 'Anuncio no encontrado',
        status: 404,
      });
    }
    if (listing.status !== 'active') {
      throw new AppError({
        code: 'LISTING_UNAVAILABLE',
        message: 'Este anuncio ya no está disponible',
        status: 422,
      });
    }
    if (listing.seller_id === buyerId) {
      throw new AppError({
        code: 'SELF_PURCHASE',
        message: 'No puedes comprar tu propio anuncio',
        status: 422,
      });
    }

    const open = await this.pool.query(
      `SELECT id FROM pulgasya_orders
       WHERE listing_id = $1 AND buyer_id = $2
         AND status IN ('pending_payment','held','shipped','delivered','disputed')
       LIMIT 1`,
      [listingId, buyerId],
    );
    if (open.rows[0]) {
      return this.getOrder(open.rows[0].id, { userId: buyerId });
    }

    return this.#insertOrder({
      listingId,
      offerId: null,
      buyerId,
      sellerId: listing.seller_id,
      amountCents: solesToCents(listing.price),
    });
  }

  async #insertOrder({ listingId, offerId, buyerId, sellerId, amountCents }) {
    const { commissionPercent, commissionCents, netToSellerCents } =
      commissionParts(amountCents);

    const { rows: [row] } = await this.pool.query(
      `INSERT INTO pulgasya_orders (
         listing_id, offer_id, buyer_id, seller_id,
         amount_cents, commission_percent, commission_cents, net_to_seller_cents,
         status, payment_provider, sandbox_label
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9,$10)
       RETURNING id`,
      [
        listingId,
        offerId,
        buyerId,
        sellerId,
        amountCents,
        commissionPercent,
        commissionCents,
        netToSellerCents,
        this.provider.name,
        'Pago en custodia PulgasYa (sandbox hasta conectar Culqi/Niubiz/MP)',
      ],
    );
    return this.getOrder(row.id);
  }

  /**
   * Pago sandbox: simula captura y deja fondos en custodia de la plataforma.
   * No acepta ni guarda PAN/CVV. Bloqueado en producción (env.sandboxPayEnabled).
   */
  async paySandbox({ orderId, buyerId, idempotencyKey }) {
    if (!env.sandboxPayEnabled) {
      throw new AppError({
        code: 'SANDBOX_PAY_DISABLED',
        message:
          'El pago sandbox no está disponible en este entorno. Contacta soporte o espera la pasarela.',
        status: 403,
      });
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (order.buyer_id !== buyerId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'Solo el comprador puede pagar',
          status: 403,
        });
      }
      if (order.status !== 'pending_payment') {
        throw new AppError({
          code: 'INVALID_STATE',
          message: 'Este pedido ya no está pendiente de pago',
          status: 422,
        });
      }
      if (order.cvv != null || order.pan != null) {
        /* defensive — columns don't exist; body checked in controller */
      }

      const charge = await this.provider.charge({
        orderId: order.id,
        amountCents: Number(order.amount_cents),
        currency: order.currency,
        buyerId,
        idempotencyKey,
      });

      await client.query(
        `UPDATE pulgasya_orders
         SET status = 'held',
             paid_at = now(),
             payment_ref = $1,
             sandbox_label = $2
         WHERE id = $3`,
        [charge.providerReference, charge.label, orderId],
      );

      await client.query(
        `INSERT INTO pulgasya_escrow_ledger
           (order_id, entry_type, amount_cents, balance_bucket, user_id, note)
         VALUES ($1, 'HOLD', $2, 'platform_escrow', $3, $4)`,
        [
          orderId,
          order.amount_cents,
          buyerId,
          `HOLD sandbox ${charge.providerReference}`,
        ],
      );

      await client.query(
        `UPDATE pulgasya_listings SET status = 'sold' WHERE id = $1`,
        [order.listing_id],
      );

      await client.query('COMMIT');
      return {
        order: await this.getOrder(orderId, { userId: buyerId }),
        payment: charge,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Webhook-shaped hook for future Culqi/Niubiz/MP. */
  async handleProviderWebhook({ type, data }) {
    if (!data?.order_id) {
      throw new AppError({
        code: 'INVALID_WEBHOOK',
        message: 'Webhook sin order_id',
        status: 400,
      });
    }
    if (type === 'payment.captured' && data.status === 'held') {
      const { rows: [order] } = await this.pool.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1`,
        [data.order_id],
      );
      if (order?.status === 'pending_payment') {
        return this.paySandbox({
          orderId: data.order_id,
          buyerId: data.buyer_id || order.buyer_id,
        });
      }
    }
    return { ignored: true, type };
  }

  async markShipped({ orderId, sellerId }) {
    return this.#transition({
      orderId,
      actorId: sellerId,
      role: 'seller',
      from: ['held'],
      to: 'shipped',
      extra: `shipped_at = now()`,
    });
  }

  async markDelivered({ orderId, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (order.seller_id !== userId && order.buyer_id !== userId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'No puedes marcar este pedido',
          status: 403,
        });
      }
      if (!['held', 'shipped'].includes(order.status)) {
        throw new AppError({
          code: 'INVALID_STATE',
          message: 'Solo puedes marcar entregado desde held o shipped',
          status: 422,
        });
      }

      const due = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);
      await client.query(
        `UPDATE pulgasya_orders
         SET status = 'delivered',
             delivered_at = now(),
             release_due_at = $1,
             shipped_at = COALESCE(shipped_at, now())
         WHERE id = $2`,
        [due.toISOString(), orderId],
      );
      await client.query('COMMIT');
      return this.getOrder(orderId, { userId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async buyerConfirm({ orderId, buyerId }) {
    const order = await this.#requireOrder(orderId);
    if (order.buyer_id !== buyerId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Solo el comprador puede confirmar',
        status: 403,
      });
    }
    if (!['delivered', 'shipped', 'held'].includes(order.status)) {
      throw new AppError({
        code: 'INVALID_STATE',
        message: 'No se puede confirmar en este estado',
        status: 422,
      });
    }
    await this.pool.query(
      `UPDATE pulgasya_orders SET buyer_confirmed_at = now() WHERE id = $1`,
      [orderId],
    );
    return this.#release({ orderId, reason: 'buyer_confirm' });
  }

  async buyerDispute({ orderId, buyerId, reason }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (order.buyer_id !== buyerId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'Solo el comprador puede reclamar',
          status: 403,
        });
      }
      if (!['held', 'shipped', 'delivered'].includes(order.status)) {
        throw new AppError({
          code: 'INVALID_STATE',
          message: 'No se puede reclamar en este estado',
          status: 422,
        });
      }
      if (order.status === 'delivered' && order.release_due_at) {
        if (new Date(order.release_due_at).getTime() < Date.now()) {
          throw new AppError({
            code: 'DISPUTE_WINDOW_CLOSED',
            message:
              'Pasaron las 24 h desde la entrega; el plazo para reclamar cerró',
            status: 422,
          });
        }
      }
      const text = String(reason ?? '').trim();
      if (text.length < 5) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Describe el reclamo (mín. 5 caracteres)',
          status: 422,
        });
      }
      await client.query(
        `UPDATE pulgasya_orders
         SET status = 'disputed',
             disputed_at = now(),
             dispute_reason = $1,
             release_due_at = NULL
         WHERE id = $2`,
        [text, orderId],
      );
      await client.query('COMMIT');
      return this.getOrder(orderId, { userId: buyerId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Mediación stub: liberar o reembolsar desde disputed. */
  async mediate({ orderId, action, note }) {
    const order = await this.#requireOrder(orderId);
    if (order.status !== 'disputed') {
      throw new AppError({
        code: 'INVALID_STATE',
        message: 'Solo pedidos en disputa',
        status: 422,
      });
    }
    await this.pool.query(
      `UPDATE pulgasya_orders SET mediation_note = $1 WHERE id = $2`,
      [String(note ?? '').trim() || null, orderId],
    );
    if (action === 'release') {
      return this.#release({ orderId, reason: 'mediation_release' });
    }
    if (action === 'refund') {
      return this.#refund({ orderId, reason: 'mediation_refund' });
    }
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Acción de mediación: release o refund',
      status: 422,
    });
  }

  async #release({ orderId, reason }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (['released', 'refunded'].includes(order.status)) {
        await client.query('COMMIT');
        return this.getOrder(orderId);
      }
      if (!['held', 'shipped', 'delivered', 'disputed'].includes(order.status)) {
        throw new AppError({
          code: 'INVALID_STATE',
          message: 'No se puede liberar en este estado',
          status: 422,
        });
      }

      const payout = await this.provider.payout({
        sellerId: order.seller_id,
        amountCents: Number(order.net_to_seller_cents),
        orderId,
      });

      await client.query(
        `UPDATE pulgasya_orders
         SET status = 'released',
             released_at = now(),
             buyer_confirmed_at = COALESCE(buyer_confirmed_at, now())
         WHERE id = $1`,
        [orderId],
      );

      await client.query(
        `INSERT INTO pulgasya_escrow_ledger
           (order_id, entry_type, amount_cents, balance_bucket, user_id, note)
         VALUES
           ($1, 'RELEASE_SELLER', $2, 'seller_payable', $3, $4),
           ($1, 'COMMISSION', $5, 'platform_revenue', NULL, $6)`,
        [
          orderId,
          order.net_to_seller_cents,
          order.seller_id,
          `Release ${reason} ${payout.providerReference}`,
          order.commission_cents,
          `Comisión PulgasYa ${order.commission_percent}%`,
        ],
      );

      // Acreditar wallet del vendedor (payout sandbox visible en billetera)
      await client.query(
        `INSERT INTO wallet_accounts (user_id, currency, balance_cents)
         VALUES ($1, 'PEN', $2)
         ON CONFLICT (user_id, currency)
         DO UPDATE SET balance_cents = wallet_accounts.balance_cents + EXCLUDED.balance_cents,
                       updated_at = now()`,
        [order.seller_id, order.net_to_seller_cents],
      );
      await client.query(
        `INSERT INTO wallet_transactions
           (user_id, type, status, amount_cents, currency, method, provider_reference, metadata)
         VALUES ($1, 'PAYOUT', 'COMPLETED', $2, 'PEN', 'ESCROW', $3, $4::jsonb)`,
        [
          order.seller_id,
          order.net_to_seller_cents,
          payout.providerReference,
          JSON.stringify({ orderId, reason }),
        ],
      );

      await client.query('COMMIT');
      return this.getOrder(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async #refund({ orderId, reason }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (order.status === 'refunded') {
        await client.query('COMMIT');
        return this.getOrder(orderId);
      }
      if (!['held', 'shipped', 'delivered', 'disputed'].includes(order.status)) {
        throw new AppError({
          code: 'INVALID_STATE',
          message: 'No se puede reembolsar en este estado',
          status: 422,
        });
      }

      const refund = await this.provider.refund({
        orderId,
        amountCents: Number(order.amount_cents),
        providerReference: order.payment_ref,
      });

      await client.query(
        `UPDATE pulgasya_orders
         SET status = 'refunded', refunded_at = now()
         WHERE id = $1`,
        [orderId],
      );
      await client.query(
        `INSERT INTO pulgasya_escrow_ledger
           (order_id, entry_type, amount_cents, balance_bucket, user_id, note)
         VALUES ($1, 'REFUND', $2, 'buyer', $3, $4)`,
        [
          orderId,
          order.amount_cents,
          order.buyer_id,
          `Refund ${reason} ${refund.providerReference}`,
        ],
      );
      await client.query('COMMIT');
      return this.getOrder(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-release: pedidos delivered cuyo release_due_at ya pasó y sin disputa.
   * El reloj empieza en delivered/received, no en el pago.
   */
  async processAutoReleases() {
    const { rows } = await this.pool.query(
      `SELECT id FROM pulgasya_orders
       WHERE status = 'delivered'
         AND release_due_at IS NOT NULL
         AND release_due_at <= now()
       ORDER BY release_due_at ASC
       LIMIT 50`,
    );
    const results = [];
    for (const row of rows) {
      try {
        const order = await this.#release({
          orderId: row.id,
          reason: 'auto_24h',
        });
        results.push({ id: row.id, ok: true, status: order.status });
      } catch (err) {
        results.push({ id: row.id, ok: false, error: err.message });
      }
    }
    return results;
  }

  async #requireOrder(orderId) {
    const { rows: [order] } = await this.pool.query(
      `SELECT * FROM pulgasya_orders WHERE id = $1`,
      [orderId],
    );
    if (!order) {
      throw new AppError({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado',
        status: 404,
      });
    }
    return order;
  }

  async #transition({ orderId, actorId, role, from, to, extra }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [order] } = await client.query(
        `SELECT * FROM pulgasya_orders WHERE id = $1 FOR UPDATE`,
        [orderId],
      );
      if (!order) {
        throw new AppError({
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido no encontrado',
          status: 404,
        });
      }
      if (role === 'seller' && order.seller_id !== actorId) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'Solo el vendedor puede hacer esto',
          status: 403,
        });
      }
      if (!from.includes(order.status)) {
        throw new AppError({
          code: 'INVALID_STATE',
          message: `Estado actual: ${order.status}`,
          status: 422,
        });
      }
      await client.query(
        `UPDATE pulgasya_orders SET status = $1, ${extra} WHERE id = $2`,
        [to, orderId],
      );
      await client.query('COMMIT');
      return this.getOrder(orderId, { userId: actorId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  commissionConfig() {
    return {
      percent: Number(env.pulgasyaCommissionPercent ?? 10),
      envKey: 'PULGASYA_COMMISSION_PERCENT',
      holdHoursAfterDelivery: HOLD_HOURS,
      provider: this.provider.name,
      readyToChargeReal: false,
      sandboxPayEnabled: env.sandboxPayEnabled,
    };
  }
}
