import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/errors.js';

const CONDITIONS = ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED', 'DEFECTIVE'];
const FLOWS = ['STANDARD', 'PREMIUM'];
const NOTARY_CLOSURE_DAYS = 15;

export class AuctionService {
  constructor({ pool }) {
    this.pool = pool;
  }

  /** Categorías activas para el formulario de alta. */
  async listCategories() {
    const { rows } = await this.pool.query(
      `SELECT id, name, slug, type
       FROM categories
       WHERE is_active
       ORDER BY type, sort_order`,
    );
    return rows;
  }

  /**
   * Crea un producto + su subasta en una sola transacción.
   * Flujo PREMIUM: crea además la cuenta de custodia (escrow) y el plazo
   * de cierre notarial, satisfaciendo las restricciones del schema.
   */
  async createAuction({ sellerId, input }) {
    const {
      title,
      description,
      categoryId,
      condition,
      startingPrice,
      minIncrement,
      durationHours,
      flow,
      photos,
      videoUrl,
    } = input;

    if (!title || !String(title).trim()) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'El título es obligatorio',
        status: 422,
      });
    }
    const normalizedPrice = this.#normalizePositive(startingPrice, 'precio inicial');
    const normalizedIncrement = this.#normalizePositive(minIncrement, 'incremento mínimo');
    const normalizedDuration = Math.max(
      1,
      Math.min(Math.round(Number(durationHours) || 24), 168),
    );
    if (!FLOWS.includes(flow)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'El flujo debe ser STANDARD o PREMIUM',
        status: 422,
      });
    }
    if (!CONDITIONS.includes(condition)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Condición de producto inválida',
        status: 422,
      });
    }
    if (categoryId) {
      const { rows: [category] } = await this.pool.query(
        'SELECT id, type FROM categories WHERE id = $1 AND is_active',
        [categoryId],
      );
      if (!category) {
        throw new AppError({
          code: 'CATEGORY_NOT_FOUND',
          message: 'Categoría no encontrada',
          status: 422,
        });
      }
      if ((category.type === 'BIENES_RAICES') !== (flow === 'PREMIUM')) {
        throw new AppError({
          code: 'FLOW_CATEGORY_MISMATCH',
          message:
            'Los bienes raíces usan el flujo PREMIUM y los cachivaches el STANDARD',
          status: 422,
        });
      }
    }

    const photoList = Array.isArray(photos)
      ? photos.map((p) => String(p).trim()).filter(Boolean).slice(0, 10)
      : [];
    const normalizedVideoUrl = videoUrl ? String(videoUrl).trim() : null;
    const productId = randomUUID();
    const auctionId = randomUUID();
    const now = new Date();
    const endsAt = new Date(now.getTime() + normalizedDuration * 3600_000);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [category] } = categoryId
        ? await client.query('SELECT id, name, type FROM categories WHERE id = $1', [categoryId])
        : { rows: [] };

      const { rows: [product] } = await client.query(
        `INSERT INTO products
           (id, seller_id, category_id, title, description,
            product_condition, base_price, photos, video_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APPROVED')
         RETURNING id`,
        [
          productId,
          sellerId,
          category?.id ?? null,
          String(title).trim(),
          description ? String(description).trim() : null,
          condition,
          normalizedPrice,
          JSON.stringify(photoList),
          normalizedVideoUrl,
        ],
      );

      let escrowId = null;
      let notaryDeadline = null;

      if (flow === 'PREMIUM') {
        const { rows: [escrow] } = await client.query(
          `INSERT INTO escrow_accounts (id, user_id, provider, provider_account_id, status)
           VALUES ($1, $2, 'MOCK', $3, 'CREATED')
           RETURNING id`,
          [randomUUID(), sellerId, `acc_${auctionId}`],
        );
        escrowId = escrow.id;
        notaryDeadline = new Date(endsAt.getTime() + NOTARY_CLOSURE_DAYS * 86400_000);

        await client.query(
          `INSERT INTO notarial_closures (id, auction_id, deadline, status)
           VALUES ($1, $2, $3, 'PENDING')`,
          [randomUUID(), auctionId, notaryDeadline],
        );
      }

      const { rows: [auction] } = await client.query(
        `INSERT INTO auctions
           (id, product_id, seller_id, flow, status, starting_price,
            current_price, min_increment, starts_at, ends_at,
            escrow_id, notary_closure_deadline)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $5, $6, $7, $8, $9, $10)
         RETURNING id, flow, status, starting_price, current_price,
                   min_increment, ends_at, escrow_id, notary_closure_deadline`,
        [
          auctionId,
          product.id,
          sellerId,
          flow,
          normalizedPrice,
          normalizedIncrement,
          now,
          endsAt,
          escrowId,
          notaryDeadline,
        ],
      );

      await client.query('COMMIT');

      return {
        ...auction,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        product_id: product.id,
        photos: photoList,
        video_url: normalizedVideoUrl,
        product_condition: condition,
        category: category?.name ?? null,
        category_type: category?.type ?? (flow === 'PREMIUM' ? 'BIENES_RAICES' : 'CACHIVACHES'),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Edita una publicación del vendedor mientras la subasta está en vivo:
   * título, descripción, fotos, video y precio (el precio solo si aún no hay
   * pujas, para no romper la lógica de la subasta).
   */
  async updateMine({ auctionId, sellerId, input }) {
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
      if (auction.seller_id !== sellerId) {
        throw new AppError({
          code: 'AUCTION_NOT_YOURS',
          message: 'Solo el dueño de la subasta puede editarla',
          status: 403,
        });
      }
      if (auction.status !== 'ACTIVE') {
        throw new AppError({
          code: 'AUCTION_NOT_ACTIVE',
          message: 'Solo puedes editar una subasta en vivo',
          status: 409,
        });
      }

      const { rows: [product] } = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [auction.product_id],
      );
      if (!product) {
        throw new AppError({
          code: 'PRODUCT_NOT_FOUND',
          message: 'Producto no encontrado',
          status: 404,
        });
      }

      let newPrice = null;
      if (
        input.price !== undefined &&
        input.price !== null &&
        String(input.price).trim() !== ''
      ) {
        const { rows: [{ count }] } = await client.query(
          'SELECT COUNT(*)::int AS count FROM bids WHERE auction_id = $1',
          [auctionId],
        );
        if (count > 0) {
          throw new AppError({
            code: 'PRICE_LOCKED',
            message:
              'La subasta ya tiene pujas: no puedes cambiar el precio en curso',
            status: 409,
          });
        }
        newPrice = this.#normalizePositive(input.price, 'precio');
        await client.query(
          'UPDATE auctions SET starting_price = $2, current_price = $2, updated_at = now() WHERE id = $1',
          [auctionId, newPrice],
        );
      }

      const title =
        input.title !== undefined && input.title !== null
          ? String(input.title).trim()
          : product.title;
      if (!title) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'El título es obligatorio',
          status: 422,
        });
      }
      const description =
        input.description !== undefined && input.description !== null
          ? String(input.description).trim() || null
          : product.description;
      const photos =
        input.photos !== undefined
          ? Array.isArray(input.photos)
            ? input.photos
                .map((p) => String(p).trim())
                .filter(Boolean)
                .slice(0, 10)
            : []
          : product.photos ?? [];
      const videoUrl =
        input.videoUrl !== undefined && input.videoUrl !== null
          ? String(input.videoUrl).trim() || null
          : product.video_url;

      await client.query(
        `UPDATE products
         SET title = $2, description = $3, photos = $4, video_url = $5,
             updated_at = now()
         WHERE id = $1`,
        [product.id, title, description, JSON.stringify(photos), videoUrl],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const detail = await this.getById({ auctionId });
    return detail.auction;
  }

  /** Elimina una publicación en vivo sin pujas (vendedor). */
  async deleteMine({ auctionId, sellerId }) {
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
      if (auction.seller_id !== sellerId) {
        throw new AppError({
          code: 'AUCTION_NOT_YOURS',
          message: 'Solo el dueño de la subasta puede eliminarla',
          status: 403,
        });
      }
      if (auction.status !== 'ACTIVE') {
        throw new AppError({
          code: 'CANNOT_DELETE',
          message: 'Solo puedes eliminar una subasta en vivo',
          status: 409,
        });
      }
      const { rows: [{ count }] } = await client.query(
        'SELECT COUNT(*)::int AS count FROM bids WHERE auction_id = $1',
        [auctionId],
      );
      if (count > 0) {
        throw new AppError({
          code: 'HAS_BIDS',
          message: 'No puedes eliminar una subasta que ya tiene pujas',
          status: 409,
        });
      }

      await client.query('DELETE FROM escrow_transactions WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM notarial_closures WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM delivery_confirmations WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM transacciones WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM wallet_holds WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM guarantee_holds WHERE auction_id = $1', [auctionId]);
      await client.query('DELETE FROM bids WHERE auction_id = $1', [auctionId]);
      if (auction.escrow_id) {
        await client.query('DELETE FROM escrow_transactions WHERE escrow_id = $1', [auction.escrow_id]);
        await client.query('DELETE FROM escrow_accounts WHERE id = $1', [auction.escrow_id]);
      }
      await client.query('DELETE FROM auctions WHERE id = $1', [auctionId]);
      await client.query('DELETE FROM products WHERE id = $1', [auction.product_id]);

      await client.query('COMMIT');
      return { deleted: true, auctionId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  #normalizePositive(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `El ${label} debe ser un número mayor a 0`,
        status: 422,
      });
    }
    return Math.round(n * 100) / 100;
  }

  /** Publicaciones del vendedor autenticado (su panel de control). */
  async listMine({ sellerId }) {
    const { rows } = await this.pool.query(
      `SELECT
         a.id,
         a.flow,
         a.status,
         a.current_price,
         a.starting_price,
         a.min_increment,
         a.ends_at,
         a.extended_until,
         a.created_at,
         p.title,
         p.photos,
         p.video_url,
         p.product_condition,
         c.name              AS category,
         c.type              AS category_type,
         (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count,
         (SELECT b.amount FROM bids b WHERE b.auction_id = a.id
            ORDER BY b.amount DESC LIMIT 1) AS top_bid,
         (SELECT u.full_name FROM bids b JOIN users u ON u.id = b.bidder_id
            WHERE b.auction_id = a.id ORDER BY b.amount DESC LIMIT 1) AS top_bidder_name
       FROM auctions a
       JOIN products p ON p.id = a.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE a.seller_id = $1
       ORDER BY a.created_at DESC`,
      [sellerId],
    );
    return rows.map((row) => ({ ...row, photos: row.photos ?? [], videoUrl: row.video_url }));
  }

  /** Postores de una subasta. Solo el dueño puede verlos (quién paga más). */
  async getAuctionBidders({ auctionId, sellerId }) {
    const { rows: [auction] } = await this.pool.query(
      `SELECT a.id, p.title, a.flow, a.status, a.current_price, a.ends_at,
              a.extended_until, a.seller_id
       FROM auctions a
       JOIN products p ON p.id = a.product_id
       WHERE a.id = $1`,
      [auctionId],
    );
    if (!auction) {
      throw new AppError({
        code: 'AUCTION_NOT_FOUND',
        message: 'Subasta no encontrada',
        status: 404,
      });
    }
    if (auction.seller_id !== sellerId) {
      throw new AppError({
        code: 'AUCTION_NOT_YOURS',
        message: 'Solo el dueño de la subasta puede ver los postores',
        status: 403,
      });
    }

    const { rows: bidders } = await this.pool.query(
      `SELECT
         b.id,
         b.amount,
         b.bid_status,
         b.created_at,
         u.id       AS bidder_id,
         u.full_name,
         u.email,
         u.phone
       FROM bids b
       JOIN users u ON u.id = b.bidder_id
       WHERE b.auction_id = $1
       ORDER BY b.amount DESC, b.created_at ASC`,
      [auctionId],
    );

    return {
      auction: {
        id: auction.id,
        title: auction.title,
        flow: auction.flow,
        status: auction.status,
        currentPrice: auction.current_price,
        endsAt: auction.extended_until ?? auction.ends_at,
      },
      topBidder: bidders[0] ?? null,
      bidders,
    };
  }

  /** Detalle público de una subasta: producto, vendedor e historial de pujas. */
  async getById({ auctionId }) {
    const { rows: [row] } = await this.pool.query(
      `SELECT
         a.id,
         a.flow,
         a.status,
         a.starting_price,
         a.current_price,
         a.min_increment,
         a.starts_at,
         a.ends_at,
         a.extended_until,
         a.notary_closure_deadline,
         a.closed_at,
         p.id                AS product_id,
         p.title,
         p.description,
         p.photos,
         p.video_url,
         p.product_condition,
         c.id                AS category_id,
         c.name              AS category,
         c.type              AS category_type,
         u.id                AS seller_id,
         u.full_name         AS seller_name,
         u.avatar_url,
         u.kyc_status,
         a.winner_id,
         (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
       FROM auctions a
       JOIN products p         ON p.id = a.product_id
       LEFT JOIN categories c  ON c.id = p.category_id
       JOIN users u            ON u.id = a.seller_id
       WHERE a.id = $1`,
      [auctionId],
    );
    if (!row) {
      throw new AppError({
        code: 'AUCTION_NOT_FOUND',
        message: 'Subasta no encontrada',
        status: 404,
      });
    }

    const { rows: bids } = await this.pool.query(
      `SELECT id, amount, bid_status, created_at
       FROM bids
       WHERE auction_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [auctionId],
    );

    const [winnerRows, deliveryRows, paymentRows, depositRows] = await Promise.all([
      this.pool.query(
        `SELECT id, full_name FROM users WHERE id = $1`,
        [row.winner_id],
      ),
      this.pool.query(
        `SELECT buyer_confirmed, buyer_confirmed_at, seller_confirmed,
                seller_confirmed_at, dispute_opened
         FROM delivery_confirmations WHERE auction_id = $1`,
        [auctionId],
      ),
      this.pool.query(
        `SELECT status, amount_cents, escrow_status, net_to_seller_cents
         FROM transacciones
         WHERE auction_id = $1 AND type = 'PAYMENT'
         ORDER BY created_at DESC LIMIT 1`,
        [auctionId],
      ),
      this.pool.query(
        `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
         FROM wallet_holds
         WHERE auction_id = $1 AND status = 'APPLIED'`,
        [auctionId],
      ),
    ]);

    const ended =
      row.status !== 'ACTIVE' ||
      new Date(row.extended_until ?? row.ends_at) <= new Date();

    return {
      auction: {
        id: row.id,
        flow: row.flow,
        status: row.status,
        startingPrice: row.starting_price,
        currentPrice: row.current_price,
        minIncrement: row.min_increment,
        startsAt: row.starts_at,
        endsAt: row.extended_until ?? row.ends_at,
        notaryClosureDeadline: row.notary_closure_deadline,
        closedAt: row.closed_at,
        bidCount: Number(row.bid_count),
        photos: row.photos ?? [],
        videoUrl: row.video_url,
        title: row.title,
        description: row.description,
        productCondition: row.product_condition,
        category: row.category,
        categoryType: row.category_type,
        ended,
        winnerId: row.winner_id,
        winner: winnerRows.rows[0] ?? null,
        delivery: deliveryRows.rows[0] ?? null,
        payment: paymentRows.rows[0] ?? null,
        downPaymentCents: Number(depositRows.rows[0]?.total ?? 0),
        seller: {
          id: row.seller_id,
          name: row.seller_name,
          avatarUrl: row.avatar_url,
          kycStatus: row.kyc_status,
        },
      },
      bids,
    };
  }

  /** Pujas del cliente autenticado, con el estado de su subasta (mis pujas). */
  async listMyBids({ bidderId }) {
    const { rows } = await this.pool.query(
      `SELECT
         b.id,
         b.amount,
         b.bid_status,
         b.created_at,
         a.id               AS auction_id,
         a.flow,
         a.status           AS auction_status,
         a.current_price,
         a.min_increment,
         a.ends_at,
         a.extended_until,
         a.winner_id,
         p.title,
         p.photos,
         p.video_url,
         c.name             AS category,
         c.type             AS category_type
       FROM bids b
       JOIN auctions a      ON a.id = b.auction_id
       JOIN products p      ON p.id = a.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [bidderId],
    );

    return rows.map((row) => {
      const ended =
        row.auction_status !== 'ACTIVE' ||
        new Date(row.extended_until ?? row.ends_at) <= new Date();
      return {
        ...row,
        photos: row.photos ?? [],
        videoUrl: row.video_url,
        ended,
        isLeading:
          !ended &&
          Number(row.amount) >= Number(row.current_price),
        won: ended && row.winner_id === bidderId,
      };
    });
  }

  /** Lista subastas ACTIVAS para el Home, con datos del producto y vendedor. */
  async listActive({ flow, q, type, category, limit = 40 }) {
    const params = [];
    const conditions = [`a.status = 'ACTIVE'`];

    if (flow === 'STANDARD' || flow === 'PREMIUM') {
      params.push(flow);
      conditions.push(`a.flow = $${params.length}`);
    }
    if (type === 'CACHIVACHES' || type === 'BIENES_RAICES') {
      params.push(type);
      conditions.push(`c.type = $${params.length}`);
    }
    if (category && category.trim()) {
      params.push(category.trim());
      conditions.push(`c.slug = $${params.length}`);
    }
    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`p.title ILIKE $${params.length}`);
    }

    params.push(Math.min(Math.max(Number(limit) || 40, 1), 100));

    const { rows } = await this.pool.query(
      `SELECT
         a.id,
         a.flow,
         a.current_price,
         a.starting_price,
         a.min_increment,
         a.ends_at,
         a.extended_until,
         p.id                AS product_id,
         p.title,
         p.photos,
         p.video_url,
         p.product_condition,
         c.name              AS category,
         c.type              AS category_type,
         u.id                AS seller_id,
         u.full_name         AS seller_name
       FROM auctions a
       JOIN products p         ON p.id = a.product_id
       LEFT JOIN categories c  ON c.id = p.category_id
       JOIN users u            ON u.id = a.seller_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(a.extended_until, a.ends_at) ASC
       LIMIT $${params.length}`,
      params,
    );

    return rows.map((row) => ({ ...row, photos: row.photos ?? [], videoUrl: row.video_url }));
  }
}
