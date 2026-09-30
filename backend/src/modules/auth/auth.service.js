import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { sendMail } from '../../utils/mail.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_VIS = new Set(['public', 'on_offer', 'nobody']);
const GATEWAYS = new Set(['CULQI', 'NIUBIZ', 'MERCADOPAGO', 'MOCK', '']);

function mapPaymentCard(row) {
  if (!row) return null;
  const last4 =
    row.card_last4 ||
    (row.masked_number ? String(row.masked_number).replace(/\D/g, '').slice(-4) : null);
  if (!last4) return null;
  return {
    brand: row.card_brand || 'Otro',
    last4: String(last4).slice(-4),
    cardholderName: row.cardholder_name || '',
    expiryMonth: row.expiry_month != null ? Number(row.expiry_month) : null,
    expiryYear: row.expiry_year != null ? Number(row.expiry_year) : null,
  };
}

function toPublicUser(user, paymentCard = null) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    displayName: user.display_name || user.full_name,
    phone: user.phone,
    address: user.address || '',
    district: user.district || '',
    city: user.city || '',
    phoneVisibility: user.phone_visibility || 'public',
    notifyWhatsapp: user.notify_whatsapp !== false,
    notifyEmail: user.notify_email !== false,
    paymentGateway: user.payment_gateway || null,
    documentType: user.document_type || null,
    documentNumber: user.document_number
      ? String(user.document_number).replace(/.(?=.{3})/g, '•')
      : null,
    kycStatus: user.kyc_status,
    role: user.role,
    avatarUrl: user.avatar_url,
    isActive: user.is_active !== false,
    createdAt: user.created_at,
    paymentCard: paymentCard ?? user.paymentCard ?? null,
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function detectBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Otro';
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function normalizePhone(phone) {
  if (phone == null || phone === '') return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) {
    throw new AppError({
      code: 'INVALID_PHONE',
      message: 'Indica un WhatsApp válido (mín. 9 dígitos, con código de país 51)',
      status: 422,
    });
  }
  return digits;
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

  /** Registro email + contraseña (PulgasYa). */
  async register({ email, password, fullName, phone }) {
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
    if (String(password ?? '').length < 6) {
      throw new AppError({
        code: 'WEAK_PASSWORD',
        message: 'La contraseña debe tener al menos 6 caracteres',
        status: 422,
      });
    }
    const phoneNorm = normalizePhone(phone);

    try {
      const { rows: [user] } = await this.pool.query(
        `INSERT INTO users
           (id, email, password_hash, full_name, phone, kyc_status, role, last_login_at)
         VALUES ($1, $2, $3, $4, $5, 'NOT_STARTED', 'USER', now())
         RETURNING *`,
        [
          randomUUID(),
          normalizedEmail,
          hashPassword(password),
          name,
          phoneNorm,
        ],
      );
      return { token: issueToken(user), user: toPublicUser(user) };
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError({
          code: 'EMAIL_TAKEN',
          message: 'Ya existe una cuenta con ese correo',
          status: 409,
        });
      }
      throw err;
    }
  }

  /** Login email + contraseña. */
  async login({ email, password }) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const { rows: [user] } = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail],
    );
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new AppError({
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos',
        status: 401,
      });
    }
    if (user.is_active === false || user.deleted_at) {
      throw new AppError({
        code: 'ACCOUNT_DISABLED',
        message: 'Esta cuenta está cerrada o desactivada',
        status: 403,
      });
    }
    await this.pool.query(
      'UPDATE users SET last_login_at = now() WHERE id = $1',
      [user.id],
    );
    const paymentCard = await this.getPaymentCard(user.id);
    return { token: issueToken(user), user: toPublicUser(user, paymentCard) };
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

      return { token: issueToken(user), user: toPublicUser(user) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getPaymentCard(userId) {
    const { rows: [card] } = await this.pool.query(
      `SELECT card_brand, card_last4, masked_number, cardholder_name,
              expiry_month, expiry_year
       FROM payment_methods
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY is_default DESC, created_at DESC
       LIMIT 1`,
      [userId],
    );
    return mapPaymentCard(card);
  }

  async getUserById(id) {
    const { rows: [user] } = await this.pool.query(
      `SELECT id, email, full_name, display_name, phone, address, district, city,
              phone_visibility, notify_whatsapp, notify_email, payment_gateway,
              document_type, document_number, kyc_status, role, avatar_url,
              is_active, deleted_at, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    if (!user || user.deleted_at) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    const paymentCard = await this.getPaymentCard(id);
    return toPublicUser(user, paymentCard);
  }

  /**
   * Configuración PulgasYa: teléfono, correo (con contraseña) y metadatos de tarjeta.
   * Nunca acepta ni guarda PAN completo ni CVV.
   */
  async updateProfile({ userId, input }) {
    const { rows: [current] } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId],
    );
    if (!current) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }

    // Rechazar datos de tarjeta sensibles si llegan por error
    if (input.cvv != null || input.cardCvv != null || input.pan != null) {
      throw new AppError({
        code: 'CARD_SENSITIVE_REJECTED',
        message: 'Por seguridad no guardamos el número completo ni el CVV.',
        status: 422,
      });
    }
    if (input.cardNumber != null) {
      const digits = String(input.cardNumber).replace(/\D/g, '');
      if (digits.length > 4) {
        throw new AppError({
          code: 'CARD_SENSITIVE_REJECTED',
          message: 'Solo se guardan los últimos 4 dígitos de la tarjeta.',
          status: 422,
        });
      }
    }

    let fullName = current.full_name;
    if (input.fullName !== undefined) {
      fullName = String(input.fullName ?? '').trim();
      if (!fullName) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'El nombre es obligatorio',
          status: 422,
        });
      }
    }

    let displayName = current.display_name;
    if (input.displayName !== undefined) {
      displayName = String(input.displayName ?? '').trim() || null;
    }

    let phone = current.phone;
    if (input.phone !== undefined) {
      phone = normalizePhone(input.phone);
    }

    let email = current.email;
    if (input.email !== undefined) {
      const nextEmail = String(input.email ?? '').trim().toLowerCase();
      if (!EMAIL_RE.test(nextEmail)) {
        throw new AppError({
          code: 'INVALID_EMAIL',
          message: 'El correo es inválido',
          status: 422,
        });
      }
      if (nextEmail !== String(current.email).toLowerCase()) {
        if (!input.currentPassword) {
          throw new AppError({
            code: 'PASSWORD_REQUIRED',
            message: 'Confirma tu contraseña actual para cambiar el correo',
            status: 422,
          });
        }
        if (!verifyPassword(input.currentPassword, current.password_hash)) {
          throw new AppError({
            code: 'INVALID_CREDENTIALS',
            message: 'Contraseña incorrecta',
            status: 401,
          });
        }
        email = nextEmail;
      }
    }

    const address =
      input.address !== undefined
        ? String(input.address ?? '').trim()
        : current.address;
    const district =
      input.district !== undefined
        ? String(input.district ?? '').trim()
        : current.district;
    const city =
      input.city !== undefined
        ? String(input.city ?? '').trim()
        : current.city;

    let phoneVisibility = current.phone_visibility || 'public';
    if (input.phoneVisibility !== undefined) {
      const v = String(input.phoneVisibility).trim();
      if (!PHONE_VIS.has(v)) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Visibilidad de teléfono inválida',
          status: 422,
        });
      }
      phoneVisibility = v;
    }

    let notifyWhatsapp =
      current.notify_whatsapp !== false && current.notify_whatsapp !== null
        ? current.notify_whatsapp
        : true;
    if (input.notifyWhatsapp !== undefined) {
      notifyWhatsapp = Boolean(input.notifyWhatsapp);
    }
    let notifyEmail =
      current.notify_email !== false && current.notify_email !== null
        ? current.notify_email
        : true;
    if (input.notifyEmail !== undefined) {
      notifyEmail = Boolean(input.notifyEmail);
    }

    let paymentGateway = current.payment_gateway;
    if (input.paymentGateway !== undefined) {
      const g = String(input.paymentGateway ?? '')
        .trim()
        .toUpperCase();
      if (!GATEWAYS.has(g)) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Pasarela no soportada',
          status: 422,
        });
      }
      paymentGateway = g || null;
    }

    const avatarUrl =
      input.avatarUrl != null ? String(input.avatarUrl).trim() : '';

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let user;
      try {
        const { rows } = await client.query(
          `UPDATE users
           SET full_name = $1,
               display_name = $2,
               phone = $3,
               email = $4,
               address = $5,
               district = $6,
               city = $7,
               phone_visibility = $8,
               notify_whatsapp = $9,
               notify_email = $10,
               payment_gateway = $11,
               avatar_url = COALESCE(NULLIF($12, ''), avatar_url)
           WHERE id = $13
           RETURNING *`,
          [
            fullName,
            displayName,
            phone,
            email,
            address,
            district,
            city,
            phoneVisibility,
            notifyWhatsapp,
            notifyEmail,
            paymentGateway,
            avatarUrl,
            userId,
          ],
        );
        user = rows[0];
      } catch (err) {
        if (err.code === '23505') {
          throw new AppError({
            code: 'EMAIL_TAKEN',
            message: 'Ya existe una cuenta con ese correo',
            status: 409,
          });
        }
        throw err;
      }

      if (input.paymentCard || input.cardLast4 || input.cardholderName) {
        await this.#upsertPaymentCard(client, userId, input);
      }

      if (input.removePaymentCard === true) {
        await client.query(
          `UPDATE payment_methods SET is_active = FALSE, is_default = FALSE
           WHERE user_id = $1 AND is_active = TRUE`,
          [userId],
        );
      }

      await client.query('COMMIT');
      const paymentCard = await this.getPaymentCard(userId);
      return toPublicUser(user, paymentCard);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const { rows: [user] } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId],
    );
    if (!user) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    if (!verifyPassword(currentPassword, user.password_hash)) {
      throw new AppError({
        code: 'INVALID_CREDENTIALS',
        message: 'Contraseña actual incorrecta',
        status: 401,
      });
    }
    if (String(newPassword ?? '').length < 6) {
      throw new AppError({
        code: 'WEAK_PASSWORD',
        message: 'La nueva contraseña debe tener al menos 6 caracteres',
        status: 422,
      });
    }
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashPassword(newPassword), userId],
    );
    return { ok: true };
  }

  async deactivateAccount({ userId, password, confirm }) {
    if (confirm !== 'ELIMINAR' && confirm !== true) {
      throw new AppError({
        code: 'CONFIRMATION_REQUIRED',
        message: 'Escribe ELIMINAR para confirmar el cierre de cuenta',
        status: 422,
      });
    }
    const { rows: [user] } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId],
    );
    if (!user) {
      throw new AppError({
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
        status: 404,
      });
    }
    if (!verifyPassword(password, user.password_hash)) {
      throw new AppError({
        code: 'INVALID_CREDENTIALS',
        message: 'Contraseña incorrecta',
        status: 401,
      });
    }
    const tombstone = `deleted+${userId.slice(0, 8)}@pulgasya.invalid`;
    await this.pool.query(
      `UPDATE users
       SET is_active = FALSE,
           deleted_at = now(),
           email = $1,
           phone = NULL,
           avatar_url = NULL,
           full_name = 'Cuenta cerrada',
           display_name = NULL,
           address = NULL,
           district = NULL,
           city = NULL,
           document_number = NULL
       WHERE id = $2`,
      [tombstone, userId],
    );
    await this.pool.query(
      `UPDATE payment_methods SET is_active = FALSE, is_default = FALSE
       WHERE user_id = $1`,
      [userId],
    );
    await this.pool.query(
      `UPDATE pulgasya_listings SET status = 'archived'
       WHERE seller_id = $1 AND status = 'active'`,
      [userId],
    );
    return { ok: true };
  }

  async requestPasswordReset({ email }) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const generic = {
      ok: true,
      message:
        'Si el correo existe, te enviamos instrucciones para restablecer la contraseña.',
    };
    if (!EMAIL_RE.test(normalizedEmail)) return generic;

    const { rows: [user] } = await this.pool.query(
      'SELECT id, email, is_active, deleted_at FROM users WHERE email = $1',
      [normalizedEmail],
    );
    if (!user || user.is_active === false || user.deleted_at) return generic;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.pool.query(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    );
    await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt],
    );

    const resetPath = `/restablecer?token=${rawToken}`;
    const resetUrl = `${env.clientOrigin.replace(/\/$/, '')}${resetPath}`;
    await sendMail({
      to: user.email,
      subject: 'Restablecer contraseña — PulgasYa',
      text: [
        'Hola,',
        '',
        'Recibimos una solicitud para restablecer tu contraseña en PulgasYa.',
        `Abre este enlace (válido 1 hora): ${resetUrl}`,
        '',
        'Si no fuiste tú, ignora este mensaje.',
      ].join('\n'),
    });

    const result = { ...generic };
    if (env.nodeEnv !== 'production') {
      result.devResetUrl = resetUrl;
      result.devToken = rawToken;
    }
    return result;
  }

  async resetPassword({ token, newPassword }) {
    const raw = String(token ?? '').trim();
    if (!raw) {
      throw new AppError({
        code: 'INVALID_TOKEN',
        message: 'Enlace inválido o caducado',
        status: 400,
      });
    }
    if (String(newPassword ?? '').length < 6) {
      throw new AppError({
        code: 'WEAK_PASSWORD',
        message: 'La contraseña debe tener al menos 6 caracteres',
        status: 422,
      });
    }
    const { rows: [row] } = await this.pool.query(
      `SELECT t.*, u.id AS uid
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
         AND t.used_at IS NULL
         AND t.expires_at > now()
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL`,
      [hashToken(raw)],
    );
    if (!row) {
      throw new AppError({
        code: 'INVALID_TOKEN',
        message: 'Enlace inválido o caducado',
        status: 400,
      });
    }
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashPassword(newPassword), row.uid],
    );
    await this.pool.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE id = $1',
      [row.id],
    );
    return { ok: true };
  }

  /**
   * Flujo DNI / identidad: guarda documento + URLs de fotos y deja estado PENDING.
   * La verificación admin es stub (no auto-aprueba).
   */
  async submitKyc({
    userId,
    documentType = 'DNI',
    documentNumber,
    frontImageUrl,
    backImageUrl,
    selfieImageUrl,
  }) {
    const docType = String(documentType || 'DNI').toUpperCase();
    if (!['DNI', 'CE', 'PASAPORTE'].includes(docType)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Tipo de documento inválido',
        status: 422,
      });
    }
    const number = String(documentNumber ?? '').replace(/\s/g, '');
    if (docType === 'DNI' && !/^\d{8}$/.test(number)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'El DNI debe tener 8 dígitos',
        status: 422,
      });
    }
    if (!number || number.length < 6) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Número de documento inválido',
        status: 422,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [user] } = await client.query(
        'SELECT kyc_status FROM users WHERE id = $1 FOR UPDATE',
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

      await client.query(
        `UPDATE users
         SET document_type = $1::document_type,
             document_number = $2,
             kyc_status = 'PENDING'
         WHERE id = $3`,
        [docType, number, userId],
      );

      await client.query(
        `INSERT INTO kyc_verifications
           (user_id, document_type, document_number, front_image_url,
            back_image_url, selfie_image_url, status, biometric_status)
         VALUES ($1, $2::document_type, $3, $4, $5, $6, 'PENDING', 'PENDING')
         ON CONFLICT (user_id, document_type, document_number)
         DO UPDATE SET
           front_image_url = EXCLUDED.front_image_url,
           back_image_url = EXCLUDED.back_image_url,
           selfie_image_url = EXCLUDED.selfie_image_url,
           status = 'PENDING',
           rejection_reason = NULL,
           updated_at = now()`,
        [
          userId,
          docType,
          number,
          frontImageUrl || null,
          backImageUrl || null,
          selfieImageUrl || null,
        ],
      );

      await client.query('COMMIT');
      return this.getUserById(userId);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        throw new AppError({
          code: 'DOCUMENT_TAKEN',
          message: 'Ese documento ya está asociado a otra cuenta',
          status: 409,
        });
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async #upsertPaymentCard(client, userId, input) {
    const card = input.paymentCard || {};
    let last4 = String(
      card.last4 ?? input.cardLast4 ?? input.cardNumber ?? '',
    ).replace(/\D/g, '');
    if (last4.length > 4) last4 = last4.slice(-4);
    if (last4.length !== 4) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Indica los últimos 4 dígitos de la tarjeta',
        status: 422,
      });
    }

    const cardholderName = String(
      card.cardholderName ?? input.cardholderName ?? '',
    ).trim();
    if (!cardholderName) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Indica el nombre del titular',
        status: 422,
      });
    }

    let expiryMonth = Number(card.expiryMonth ?? input.expiryMonth);
    let expiryYear = Number(card.expiryYear ?? input.expiryYear);
    if (input.expiry) {
      const m = String(input.expiry).match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
      if (m) {
        expiryMonth = Number(m[1]);
        expiryYear = Number(m[2].length === 2 ? `20${m[2]}` : m[2]);
      }
    }
    if (
      !Number.isFinite(expiryMonth) ||
      expiryMonth < 1 ||
      expiryMonth > 12 ||
      !Number.isFinite(expiryYear) ||
      expiryYear < 2024
    ) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Fecha de vencimiento inválida (MM/AA)',
        status: 422,
      });
    }

    const brand = String(
      card.brand ?? input.cardBrand ?? detectBrand(last4),
    ).trim() || 'Otro';

    const masked = `•••• ${last4}`;
    const token = `pulgasya-meta:${userId}:${last4}:${expiryMonth}${expiryYear}`;

    await client.query(
      `UPDATE payment_methods SET is_active = FALSE, is_default = FALSE
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );

    await client.query(
      `INSERT INTO payment_methods
         (user_id, provider, provider_token, card_brand, masked_number, card_last4,
          cardholder_name, expiry_month, expiry_year, is_default, is_active)
       VALUES ($1, 'MOCK', $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)`,
      [
        userId,
        token,
        brand,
        masked,
        last4,
        cardholderName,
        expiryMonth,
        expiryYear,
      ],
    );
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
    await this.pool.query(
      `UPDATE users SET kyc_status = 'PENDING' WHERE id = $1`,
      [userId],
    );
    return this.getUserById(userId);
  }
}
