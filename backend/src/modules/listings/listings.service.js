import { AppError } from '../../utils/errors.js';
import { rankRelated, tokenize } from './related.js';

/**
 * Valores canónicos de estado del producto (5 niveles).
 * Se aceptan alias antiguos para no romper anuncios ya publicados.
 */
const CONDITION_ALIASES = {
  nuevo: 'nuevo',
  'con etiqueta': 'nuevo',
  'como nuevo': 'como-nuevo',
  'como-nuevo': 'como-nuevo',
  'sin uso visible': 'como-nuevo',
  bueno: 'bueno',
  'buen estado': 'bueno',
  'con detalles': 'bueno',
  aceptable: 'lo-ha-dado-todo',
  regular: 'lo-ha-dado-todo',
  'lo ha dado todo': 'lo-ha-dado-todo',
  'lo-ha-dado-todo': 'lo-ha-dado-todo',
  'desgaste visible': 'lo-ha-dado-todo',
  'no funciona': 'no-funciona',
  'no-funciona': 'no-funciona',
  'para reparar': 'no-funciona',
};

/** Claves de atributos que el catálogo puede filtrar (attributes JSONB). */
const ATTRIBUTE_FILTER_KEYS = [
  'brand',
  'storage',
  'bikeType',
  'wheel',
  'size',
  'color',
  'ageRange',
  'topic',
  'format',
  'collection',
  'era',
  'sport',
  'room',
  'material',
  'year',
  'fuel',
  'transmission',
];

const ATTRIBUTE_KEY_RE = /^[a-z][a-zA-Z0-9]{0,31}$/;

function canonicalCondition(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;
  return CONDITION_ALIASES[key] || null;
}

function normalizeSubcategory(value) {
  const slug = String(value ?? '').trim().toLowerCase();
  if (!slug) return '';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug.slice(0, 60) : '';
}

function sanitizeAttributes(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!ATTRIBUTE_KEY_RE.test(key)) continue;
    if (raw == null) continue;
    if (
      typeof raw !== 'string' &&
      typeof raw !== 'number' &&
      typeof raw !== 'boolean'
    ) {
      continue;
    }
    const value = String(raw).trim();
    if (!value) continue;
    out[key] = value.slice(0, 80);
    if (Object.keys(out).length >= 20) break;
  }
  return out;
}

function mapSeller(row, { revealPhone = true } = {}) {
  return {
    id: row.seller_id,
    name: row.seller_display_name || row.seller_name,
    phone: revealPhone ? row.seller_phone : null,
    phoneVisibility: row.seller_phone_visibility || 'public',
    rating: row.seller_rating != null ? Number(row.seller_rating) : null,
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
    subcategory: row.subcategory || undefined,
    attributes:
      row.attributes &&
      typeof row.attributes === 'object' &&
      !Array.isArray(row.attributes)
        ? row.attributes
        : {},
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
         -- Sin sistema de reseñas todavía: no inventar valoraciones.
         NULL::float AS seller_rating,
         0::int AS seller_reviews,
         (u.kyc_status = 'VERIFIED') AS seller_verified
  FROM pulgasya_listings l
  JOIN users u ON u.id = l.seller_id
`;

export class ListingsService {
  constructor({ pool }) {
    this.pool = pool;
    this.escrowService = null;
  }

  async list({
    tipo,
    q,
    cat,
    sub,
    condition,
    minPrice,
    maxPrice,
    date,
    sort,
    limit = 48,
    ...attributeFilters
  } = {}) {
    const clauses = [`l.status = 'active'`];
    const params = [];
    let i = 1;

    if (tipo === 'producto' || tipo === 'servicio') {
      clauses.push(`l.type = $${i++}`);
      params.push(tipo);
    }
    if (cat) {
      clauses.push(`l.category = $${i++}`);
      params.push(String(cat).trim());
    }
    if (sub) {
      clauses.push(`l.subcategory = $${i++}`);
      params.push(String(sub).trim());
    }
    if (condition) {
      const normalizedCondition = canonicalCondition(condition);
      if (normalizedCondition) {
        clauses.push(`l.condition = $${i++}`);
        params.push(normalizedCondition);
      }
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice !== undefined && Number.isFinite(min) && min > 0) {
      clauses.push(`l.price >= $${i++}`);
      params.push(min);
    }
    if (maxPrice !== undefined && Number.isFinite(max) && max > 0) {
      clauses.push(`l.price <= $${i++}`);
      params.push(max);
    }

    const dateHours =
      date === '24h' ? 24 : date === '7d' ? 24 * 7 : date === '30d' ? 24 * 30 : null;
    if (dateHours) {
      clauses.push(`l.created_at >= $${i++}`);
      params.push(new Date(Date.now() - dateHours * 60 * 60 * 1000));
    }

    for (const key of ATTRIBUTE_FILTER_KEYS) {
      const raw = attributeFilters[key];
      if (raw == null) continue;
      const value = String(raw).trim();
      if (!value) continue;
      clauses.push(`(l.attributes ->> $${i}::text) = $${i + 1}::text`);
      params.push(key, value);
      i += 2;
    }

    if (q?.trim()) {
      clauses.push(
        `(l.title ILIKE $${i} OR l.description ILIKE $${i} OR l.location ILIKE $${i})`,
      );
      params.push(`%${q.trim()}%`);
      i += 1;
    }

    const orderBy =
      sort === 'price_asc'
        ? 'l.price ASC, l.created_at DESC'
        : sort === 'price_desc'
          ? 'l.price DESC, l.created_at DESC'
          : 'l.created_at DESC';

    params.push(Math.min(Number(limit) || 48, 100));
    const { rows } = await this.pool.query(
      `${LISTING_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}
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

  /**
   * Normaliza y valida los campos editables de un anuncio.
   * `type` nunca se toma del cliente al editar: se conserva el original.
   */
  #normalizeInput(input, { type, fallbackImages = [] }) {
    const title = String(input.title ?? '').trim();
    const description = String(input.description ?? '').trim() || 'Sin descripción adicional.';
    const price = Number(input.price);
    const category = String(input.category ?? '').trim();
    const subcategory =
      type === 'producto' ? normalizeSubcategory(input.subcategory) : '';
    const attributes =
      type === 'producto' ? sanitizeAttributes(input.attributes) : {};
    const location = String(input.location ?? '').trim();
    const images = Array.isArray(input.images)
      ? input.images.filter((u) => typeof u === 'string' && u.trim()).slice(0, 8)
      : fallbackImages;

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
      condition = canonicalCondition(input.condition) || 'bueno';
      negotiable = input.negotiable !== false;
      shipping = input.shipping === 'envio' ? 'envio' : 'persona';
    }

    return {
      title,
      description,
      price,
      category,
      subcategory,
      attributes,
      location,
      images,
      priceMode,
      condition,
      negotiable,
      shipping,
      zone,
      availableToday,
    };
  }

  async create({ sellerId, input }) {
    const type = input.type === 'servicio' ? 'servicio' : 'producto';
    const data = this.#normalizeInput(input, { type });

    const { rows: [row] } = await this.pool.query(
      `INSERT INTO pulgasya_listings (
         seller_id, type, title, description, price, currency, price_mode,
         category, subcategory, attributes, location, condition, negotiable,
         shipping, zone, available_today, images
       ) VALUES (
         $1,$2,$3,$4,$5,'PEN',$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16::jsonb
       )
       RETURNING id`,
      [
        sellerId,
        type,
        data.title,
        data.description,
        data.price,
        data.priceMode,
        data.category,
        data.subcategory || null,
        JSON.stringify(data.attributes),
        data.location,
        data.condition,
        data.negotiable,
        data.shipping,
        data.zone,
        data.availableToday,
        JSON.stringify(data.images),
      ],
    );

    return this.getById(row.id, { viewerId: sellerId });
  }

  /** Verifica que el anuncio exista y pertenezca al usuario. */
  async #assertOwner(id, sellerId) {
    const { rows: [row] } = await this.pool.query(
      `SELECT id, seller_id, type, images, status
       FROM pulgasya_listings WHERE id = $1`,
      [id],
    );
    if (!row) {
      throw new AppError({
        code: 'LISTING_NOT_FOUND',
        message: 'Anuncio no encontrado',
        status: 404,
      });
    }
    if (row.seller_id !== sellerId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Solo el dueño puede modificar este anuncio',
        status: 403,
      });
    }
    return row;
  }

  /**
   * Edita los datos y las fotos de un anuncio propio.
   * El tipo (producto/servicio) no se puede cambiar.
   */
  async update({ id, sellerId, input }) {
    const existing = await this.#assertOwner(id, sellerId);
    const fallbackImages = Array.isArray(existing.images) ? existing.images : [];
    const data = this.#normalizeInput(input, {
      type: existing.type,
      fallbackImages,
    });

    await this.pool.query(
      `UPDATE pulgasya_listings SET
         title = $2,
         description = $3,
         price = $4,
         price_mode = $5,
         category = $6,
         subcategory = $7,
         attributes = $8::jsonb,
         location = $9,
         condition = $10,
         negotiable = $11,
         shipping = $12,
         zone = $13,
         available_today = $14,
         images = $15::jsonb
       WHERE id = $1 AND seller_id = $16`,
      [
        id,
        data.title,
        data.description,
        data.price,
        data.priceMode,
        data.category,
        data.subcategory || null,
        JSON.stringify(data.attributes),
        data.location,
        data.condition,
        data.negotiable,
        data.shipping,
        data.zone,
        data.availableToday,
        JSON.stringify(data.images),
        sellerId,
      ],
    );

    return this.getById(id, { viewerId: sellerId });
  }

  /** Pausa (archived), reactiva (active) o marca vendido (sold). */
  async setStatus({ id, sellerId, status }) {
    if (!['active', 'sold', 'archived'].includes(status)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Estado inválido (active, sold o archived)',
        status: 422,
      });
    }
    await this.#assertOwner(id, sellerId);
    await this.pool.query(
      `UPDATE pulgasya_listings SET status = $2
       WHERE id = $1 AND seller_id = $3`,
      [id, status, sellerId],
    );
    return this.getById(id, { viewerId: sellerId });
  }

  /** Elimina definitivamente un anuncio sin pedidos asociados. */
  async remove({ id, sellerId }) {
    await this.#assertOwner(id, sellerId);
    try {
      await this.pool.query(
        `DELETE FROM pulgasya_listings WHERE id = $1 AND seller_id = $2`,
        [id, sellerId],
      );
    } catch (err) {
      // 23503 = violación de clave foránea: hay pedidos en custodia.
      if (err.code === '23503') {
        throw new AppError({
          code: 'LISTING_HAS_ORDERS',
          message:
            'Este anuncio tiene pedidos en custodia y no se puede eliminar. Páusalo o márcalo como vendido.',
          status: 409,
        });
      }
      throw err;
    }
    return { id };
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

  /**
   * Relacionados a un anuncio: categoría, tokens de título, ubicación, precio ±30%.
   */
  async relatedForListing(id, { limit = 12 } = {}) {
    const seed = await this.getById(id);
    const exclude = new Set([id]);
    const { rows } = await this.pool.query(
      `${LISTING_SELECT}
       WHERE l.status = 'active' AND l.id <> $1
       ORDER BY l.created_at DESC
       LIMIT 80`,
      [id],
    );
    const candidates = rows
      .map((row) =>
        this.#mapListingWithPhone(row, { viewerId: null, hasOffer: false }),
      )
      .filter((c) => !exclude.has(c.id));

    const ctx = {
      type: seed.type,
      category: seed.category,
      location: seed.location,
      price: seed.price,
      tokens: tokenize(`${seed.title} ${seed.description || ''}`),
    };
    return rankRelated(candidates, ctx, {
      limit: Math.min(Number(limit) || 12, 16),
    });
  }

  /**
   * Relacionados a una búsqueda (q / cat / tipo), excluyendo IDs ya mostrados.
   */
  async relatedForQuery({
    q,
    tipo,
    cat,
    exclude = [],
    priceHint,
    limit = 12,
  } = {}) {
    const excludeSet = new Set(
      (Array.isArray(exclude) ? exclude : String(exclude || '').split(','))
        .map((x) => String(x).trim())
        .filter(Boolean),
    );

    const clauses = [`l.status = 'active'`];
    const params = [];
    let i = 1;
    if (tipo === 'producto' || tipo === 'servicio') {
      clauses.push(`l.type = $${i++}`);
      params.push(tipo);
    }
    // Ampliar pool: mismos tipo/cat si hay, sin filtrar por q (el score usa tokens)
    if (cat) {
      // prefer same cat but also fetch without — pull wider set
    }

    params.push(100);
    const { rows } = await this.pool.query(
      `${LISTING_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${i}`,
      params,
    );

    const candidates = rows
      .map((row) =>
        this.#mapListingWithPhone(row, { viewerId: null, hasOffer: false }),
      )
      .filter((c) => !excludeSet.has(c.id));

    const tokens = tokenize(q || '');
    let price = Number(priceHint);
    if (!Number.isFinite(price) && candidates.length) {
      const prices = candidates.map((c) => c.price).filter((n) => n > 0).sort((a, b) => a - b);
      price = prices[Math.floor(prices.length / 2)] || null;
    }

    const ctx = {
      type: tipo === 'producto' || tipo === 'servicio' ? tipo : null,
      category: cat || null,
      location: tokens.length ? null : null,
      price,
      tokens: tokens.length ? tokens : tokenize(cat || ''),
    };

    // If query empty, soft-related by category/type/recency among non-excluded
    let ranked = rankRelated(candidates, ctx, {
      limit: Math.min(Number(limit) || 12, 16),
    });
    if (!ranked.length) {
      ranked = candidates
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        )
        .slice(0, Math.min(Number(limit) || 12, 16));
    }
    return ranked;
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
