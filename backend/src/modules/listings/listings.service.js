import { AppError } from '../../utils/errors.js';

function mapSeller(row) {
  return {
    id: row.seller_id,
    name: row.seller_name,
    phone: row.seller_phone,
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
         u.phone AS seller_phone,
         4.8::float AS seller_rating,
         12::int AS seller_reviews,
         (u.kyc_status = 'VERIFIED') AS seller_verified
  FROM pulgasya_listings l
  JOIN users u ON u.id = l.seller_id
`;

export class ListingsService {
  constructor({ pool }) {
    this.pool = pool;
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
    return rows.map(mapListing);
  }

  async getById(id) {
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
    return mapListing(row);
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
    const listing = await this.getById(listingId);
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
    const listing = await this.getById(listingId);
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
    return rows.map(mapListing);
  }
}
