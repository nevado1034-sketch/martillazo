import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    kycStatus: user.kyc_status,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  };
}

/**
 * Autenticación social. En desarrollo, el proveedor se simula con un perfil
 * recibido en el body (equivalente a lo que devolvería el callback OAuth de
 * Google/Facebook). En producción se debe intercambiar el `code` por tokens.
 *
 * El control de clientes vive en la tabla `users`: cada correo social distinto
 * crea (o actualiza) un registro — de ahí se sabe quién publica (seller_id en
 * auctions) y quién puja (bidder_id en bids).
 */
export class AuthService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async loginWithSocial({ provider, email, fullName, phone, avatarUrl }) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      throw new AppError({
        code: 'INVALID_EMAIL',
        message: 'El correo es inválido',
        status: 422,
      });
    }
    const name = String(fullName ?? '').trim();
    if (!name) {
      throw new AppError({
        code: 'INVALID_NAME',
        message: 'El nombre es obligatorio',
        status: 422,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [existing] } = await client.query(
        'SELECT * FROM users WHERE email = $1 FOR UPDATE',
        [normalizedEmail],
      );

      let user = existing;
      if (!user) {
        // Registro: nuevo cliente se crea y queda controlado en `users`.
        const { rows: [created] } = await client.query(
          `INSERT INTO users
             (id, email, password_hash, full_name, phone, avatar_url, kyc_status, role, last_login_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'NOT_STARTED', 'USER', now())
           RETURNING *`,
          [
            randomUUID(),
            normalizedEmail,
            `social:${provider}:no-password`,
            name,
            phone ? String(phone).trim() : null,
            avatarUrl ?? null,
          ],
        );
        user = created;
      } else {
        await client.query(
          `UPDATE users
           SET full_name = COALESCE(NULLIF($1, ''), full_name),
               phone = COALESCE(NULLIF($2, ''), phone),
               avatar_url = COALESCE(NULLIF($3, ''), avatar_url),
               last_login_at = now()
           WHERE id = $4`,
          [name, phone ?? '', avatarUrl ?? '', user.id],
        );
        user = { ...user, full_name: name, last_login_at: new Date() };
      }

      await client.query('COMMIT');

      const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
      });
      return { token, user: toPublicUser(user) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getUserById(id) {
    const { rows: [user] } = await this.pool.query(
      `SELECT id, email, full_name, phone, kyc_status, role, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    if (!user) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    return toPublicUser(user);
  }

  /** Actualiza los datos editables del perfil del cliente. */
  async updateProfile({ userId, input }) {
    const fullName = String(input.fullName ?? '').trim();
    if (!fullName) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'El nombre es obligatorio',
        status: 422,
      });
    }
    const phone = input.phone != null ? String(input.phone).trim() : null;
    const avatarUrl = input.avatarUrl != null ? String(input.avatarUrl).trim() : null;

    const { rows: [user] } = await this.pool.query(
      `UPDATE users
       SET full_name = $1,
           phone = COALESCE(NULLIF($2, ''), phone),
           avatar_url = COALESCE(NULLIF($3, ''), avatar_url)
       WHERE id = $4
       RETURNING id, email, full_name, phone, kyc_status, role, avatar_url, created_at`,
      [fullName, phone, avatarUrl, userId],
    );
    if (!user) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    return toPublicUser(user);
  }

  /** Solicita la verificación de identidad (KYC). No permite revertir VERIFIED. */
  async requestKyc({ userId }) {
    const { rows: [user] } = await this.pool.query(
      'SELECT kyc_status FROM users WHERE id = $1',
      [userId],
    );
    if (!user) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    if (user.kyc_status === 'VERIFIED') {
      throw new AppError({
        code: 'KYC_ALREADY_VERIFIED',
        message: 'Tu identidad ya está verificada',
        status: 422,
      });
    }
    const { rows: [updated] } = await this.pool.query(
      `UPDATE users
       SET kyc_status = 'PENDING'
       WHERE id = $1
       RETURNING id, email, full_name, phone, kyc_status, role, avatar_url, created_at`,
      [userId],
    );
    return toPublicUser(updated);
  }
}
