import { AppError } from '../../utils/errors.js';

function mapSeller(row, { revealPhone = true } = {}) {
  return {
    id: row.seller_id,
    name: row.seller_display_name || row.seller_name,
    phone: revealPhone ? row.seller_phone : null,
    phoneVisibility: row.seller_phone_visibility || 'public',
    rating: row.seller_rating != null ? Number(row.seller_rating) : 5,
    reviews: row.seller_reviews != null ? Number(row.seller_reviews) : 0,
    verified: row.seller_verified === true,
  };
}

function mapListing(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    currency: row.currency || 'PEN',
    priceMode: row.price_mode || undefined,
    category: row.category,
    location: row.location,
    condition: row.condition || undefined,
    negotiable: row.negotiable,
    shipping: row.shipping || undefined,
    zone: row.zone || undefined,
    availableToday: row.available_today,
    images: Array.isArray(row.images) ? row.images : row.images ?? [],
    status: row.status,
    createdAt: row.created_at,
    seller: mapSeller(row),
  };
}

function mapOffer(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    amount: Number(row.amount),
    message: row.message || '',
    status: row.status,
    createdAt: row.created_at,
    buyer: {
      id: row.buyer_id,
      name: row.buyer_name,
      phone: row.buyer_phone,
    },
    listingTitle: row.listing_title,
  };
}

const LISTING_SELECT = `
  SELECT l.*,
         u.full_name AS seller_name,
         COALESCE(u.display_name, u.full_name) AS seller_display_name,
         u.phone AS seller_phone,
         COALESCE(u.phone_visibility, 'public') AS seller_phone_visibility,
         4.8::float AS seller_rating,
         12::int AS seller_reviews,
         (u.kyc_status = 'VERIFIED') AS seller_verified
  FROM pulgasya_listings l
  JOIN users u ON u.id = l.seller_id
`;

export class ListingsService {
  constructor({ pool }) {
    this.pool = pool;
    this.escrowService = null;
  }

  async list({ tipo, q, cat, limit = 48 } = {}) {
    const clauses = [`l.status = 'active'`];
    const params = [];
    let i = 1;

    if (tipo === 'producto' || tipo === 'servicio') {
      clauses.push(`l.type = $${i++}`);
      params.push(tipo);
    }
    if (cat) {
      clauses.push(`l.category = $${i++}`);
      params.push(cat);
    }
    if (q?.trim()) {
      clauses.push(
        `(l.title ILIKE $${i} OR l.description ILIKE $${i} OR l.location ILIKE $${i})`,
      );
      params.push(`%${q.trim()}%`);
      i += 1;
    }

    params.push(Math.min(Number(limit) || 48, 100));
    const { rows } = await this.pool.query(
      `${LISTING_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${i}`,
      params,
    );
    return rows.map((row) =>
      this.#mapListingWithPhone(row, { viewerId: null, hasOffer: false }),
    );
  }

  async getById(id, { viewerId = null } = {}) {
    const { rows: [row] } = await this.pool.query(
      `${LISTING_SELECT} WHERE l.id = $1`,
      [id],
    );
    if (!row) {
      throw new AppError({
        code: 'LISTING_NOT_FOUND',
        message: 'Anuncio no encontrado',
        status: 404,
      });
    }
    let hasOffer = false;
    if (viewerId && viewerId !== row.seller_id) {
      const { rows: offers } = await this.pool.query(
        `SELECT 1 FROM pulgasya_offers
         WHERE listing_id = $1 AND buyer_id = $2 LIMIT 1`,
        [id, viewerId],
      );
      hasOffer = offers.length > 0;
    }
    return this.#mapListingWithPhone(row, { viewerId, hasOffer });
  }

  #mapListingWithPhone(row, { viewerId, hasOffer }) {
    const visibility = row.seller_phone_visibility || 'public';
    const isSeller = viewerId && viewerId === row.seller_id;
    let revealPhone = false;
    if (isSeller || visibility === 'public') revealPhone = true;
    else if (visibility === 'on_offer' && hasOffer) revealPhone = true;
    // nobody → never for others
    const listing = mapListing(row);
    listing.seller = mapSeller(row, { revealPhone });
    return listing;
  }

  async create({ sellerId, input }) {
    const type = input.type === 'servicio' ? 'servicio' : 'producto';
    const title = String(input.title ?? '').trim();
    const description = String(input.description ?? '').trim() || 'Sin descripción adicional.';
    const price = Number(input.price);
    const category = String(input.category ?? '').trim();
    const location = String(input.location ?? '').trim();
    const images = Array.isArray(input.images)
      ? input.images.filter((u) => typeof u === 'string' && u.trim()).slice(0, 8)
      : [];

    if (!title || title.length > 120) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'El título es obligatorio (máx. 120 caracteres)',
        status: 422,
      });
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Indica un precio válido en soles',
        status: 422,
      });
    }
    if (!category || !location) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Categoría y ubicación son obligatorias',
        status: 422,
      });
    }

    let priceMode = null;
    let condition = null;
    let negotiable = true;
    let shipping = null;
    let zone = null;
    let availableToday = false;

    if (type === 'servicio') {
      priceMode = ['hora', 'desde', 'fijo'].includes(input.priceMode)
        ? input.priceMode
        : 'hora';
      zone = String(input.zone ?? '').trim() || location;
      availableToday = Boolean(input.availableToday);
    } else {
      condition = String(input.condition ?? 'Buen estado').trim();
      negotiable = input.negotiable !== false;
      shipping = input.shipping === 'envio' ? 'envio' : 'persona';
    }

    const { rows: [row] } = await this.pool.query(
      `INSERT INTO pulgasya_listings (
         seller_id, type, title, description, price, currency, price_mode,
         category, location, condition, negotiable, shipping, zone,
         available_today, images
       ) VALUES (
         $1,$2,$3,$4,$5,'PEN',$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb
       )
       RETURNING id`,
      [
        sellerId,
        type,
        title,
        description,
        price,
        priceMode,
        category,
        location,
        condition,
        negotiable,
        shipping,
        zone,
        availableToday,
        JSON.stringify(images.length ? images : []),
      ],
    );

    return this.getById(row.id);
  }

  async listOffersForListing({ listingId, userId }) {
    const listing = await this.getById(listingId, { viewerId: userId });
    const isSeller = listing.seller.id === userId;

    const { rows } = await this.pool.query(
      `SELECT o.*,
              u.full_name AS buyer_name,
              u.phone AS buyer_phone,
              l.title AS listing_title
       FROM pulgasya_offers o
       JOIN users u ON u.id = o.buyer_id
       JOIN pulgasya_listings l ON l.id = o.listing_id
       WHERE o.listing_id = $1
         AND ($2::boolean OR o.buyer_id = $3)
       ORDER BY o.created_at DESC`,
      [listingId, isSeller, userId],
    );
    return { listing, offers: rows.map(mapOffer), isSeller };
  }

  async createOffer({ listingId, buyerId, amount, message }) {
    const listing = await this.getById(listingId, { viewerId: buyerId });
    if (listing.seller.id === buyerId) {
      throw new AppError({
        code: 'SELF_OFFER',
        message: 'No puedes ofertar en tu propio anuncio',
        status: 422,
      });
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Indica un importe válido en soles',
        status: 422,
      });
    }

    try {
      const { rows: [row] } = await this.pool.query(
        `INSERT INTO pulgasya_offers (listing_id, buyer_id, amount, message)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (listing_id, buyer_id)
         DO UPDATE SET amount = EXCLUDED.amount,
                       message = EXCLUDED.message,
                       status = 'pendiente',
                       created_at = now()
         RETURNING id`,
        [listingId, buyerId, n, String(message ?? '').trim()],
      );

      const { rows: [full] } = await this.pool.query(
        `SELECT o.*,
                u.full_name AS buyer_name,
                u.phone AS buyer_phone,
                l.title AS listing_title
         FROM pulgasya_offers o
         JOIN users u ON u.id = o.buyer_id
         JOIN pulgasya_listings l ON l.id = o.listing_id
         WHERE o.id = $1`,
        [row.id],
      );
      return mapOffer(full);
    } catch (err) {
      if (err.code === '23503') {
        throw new AppError({
          code: 'LISTING_NOT_FOUND',
          message: 'Anuncio no encontrado',
          status: 404,
        });
      }
      throw err;
    }
  }

  async myOffers({ buyerId }) {
    const { rows } = await this.pool.query(
      `SELECT o.*,
              u.full_name AS buyer_name,
              u.phone AS buyer_phone,
              l.title AS listing_title
       FROM pulgasya_offers o
       JOIN users u ON u.id = o.buyer_id
       JOIN pulgasya_listings l ON l.id = o.listing_id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyerId],
    );
    return rows.map(mapOffer);
  }

  async myListings({ sellerId }) {
    const { rows } = await this.pool.query(
      `${LISTING_SELECT}
       WHERE l.seller_id = $1
       ORDER BY l.created_at DESC`,
      [sellerId],
    );
    return rows.map((row) =>
      this.#mapListingWithPhone(row, { viewerId: sellerId, hasOffer: false }),
    );
  }

  /** Ofertas recibidas en anuncios del vendedor (Mis ventas). */
  async mySales({ sellerId }) {
    const { rows } = await this.pool.query(
      `SELECT o.*,
              u.full_name AS buyer_name,
              u.phone AS buyer_phone,
              l.title AS listing_title,
              l.price AS listing_price,
              l.status AS listing_status,
              l.type AS listing_type
       FROM pulgasya_offers o
       JOIN users u ON u.id = o.buyer_id
       JOIN pulgasya_listings l ON l.id = o.listing_id
       WHERE l.seller_id = $1
       ORDER BY
         CASE o.status WHEN 'pendiente' THEN 0 WHEN 'aceptada' THEN 1 ELSE 2 END,
         o.created_at DESC`,
      [sellerId],
    );
    return rows.map((row) => ({
      ...mapOffer(row),
      listingPrice: Number(row.listing_price),
      listingStatus: row.listing_status,
      listingType: row.listing_type,
    }));
  }

  async respondOffer({ offerId, sellerId, action }) {
    const next =
      action === 'accept' || action === 'aceptar'
        ? 'aceptada'
        : action === 'reject' || action === 'rechazar'
          ? 'rechazada'
          : null;
    if (!next) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Acción inválida (aceptar o rechazar)',
        status: 422,
      });
    }

    const { rows: [offer] } = await this.pool.query(
      `SELECT o.*, l.seller_id, l.title AS listing_title
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
    if (offer.seller_id !== sellerId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'No puedes gestionar esta oferta',
        status: 403,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE pulgasya_offers SET status = $1 WHERE id = $2`,
        [next, offerId],
      );
      if (next === 'aceptada') {
        await client.query(
          `UPDATE pulgasya_offers SET status = 'rechazada'
           WHERE listing_id = $1 AND id <> $2 AND status = 'pendiente'`,
          [offer.listing_id, offerId],
        );
        await client.query(
          `UPDATE pulgasya_listings SET status = 'sold' WHERE id = $1`,
          [offer.listing_id],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows: [full] } = await this.pool.query(
      `SELECT o.*,
              u.full_name AS buyer_name,
              u.phone AS buyer_phone,
              l.title AS listing_title
       FROM pulgasya_offers o
       JOIN users u ON u.id = o.buyer_id
       JOIN pulgasya_listings l ON l.id = o.listing_id
       WHERE o.id = $1`,
      [offerId],
    );
    const mapped = mapOffer(full);

    // Pedido en custodia pendiente de pago (el comprador paga a PulgasYa, no al vendedor)
    if (next === 'aceptada' && this.escrowService) {
      try {
        const order = await this.escrowService.createFromOffer({
          offerId,
          actorId: sellerId,
        });
        mapped.orderId = order.id;
        mapped.orderStatus = order.status;
      } catch (err) {
        console.warn('[listings] no se creó orden escrow:', err.message);
      }
    }
    return mapped;
  }

  setEscrowService(escrowService) {
    this.escrowService = escrowService;
  }
}
