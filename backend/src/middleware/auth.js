import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { secretsEqual } from '../utils/secrets.js';

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

/**
 * Autenticación para rutas HTTP. Espera `Authorization: Bearer <token>`.
 * El payload esperado es { sub: <userId>, role: <userRole> }.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Sesión inválida o expirada' },
    });
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

/** Autenticación opcional: si hay Bearer válido, rellena req.user; si no, sigue. */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (payload) {
    req.user = { id: payload.sub, role: payload.role };
  }
  next();
}

/**
 * Mediación / admin: role ADMIN en JWT, o email en ADMIN_EMAILS.
 * Debe ir después de `authenticate`.
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Sesión inválida o expirada' },
      });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (env.adminEmails.length > 0) {
      const { rows } = await pool.query(
        `SELECT email FROM users WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
        [req.user.id],
      );
      const email = String(rows[0]?.email ?? '')
        .trim()
        .toLowerCase();
      if (email && env.adminEmails.includes(email)) {
        req.user.role = 'ADMIN';
        return next();
      }
    }

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Solo administradores pueden mediar disputas',
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Cron/job: header X-Job-Secret debe coincidir con JOB_SECRET. */
export function requireJobSecret(req, res, next) {
  const provided = req.headers['x-job-secret'];
  if (!env.jobSecret) {
    if (env.isProduction) {
      return res.status(503).json({
        error: {
          code: 'JOB_SECRET_NOT_CONFIGURED',
          message: 'JOB_SECRET no configurado en el servidor',
        },
      });
    }
    // Dev sin secret: permitir (job interno en proceso ya corre sin HTTP)
    return next();
  }
  if (!secretsEqual(env.jobSecret, provided)) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'X-Job-Secret inválido o ausente',
      },
    });
  }
  next();
}

/**
 * Webhook proveedor: exige X-Webhook-Secret cuando ESCROW_WEBHOOK_SECRET está
 * configurado. En producción, sin secret → rechazo (no body abierto).
 */
export function requireWebhookSecret(req, res, next) {
  if (!env.escrowWebhookSecret) {
    if (env.isProduction) {
      return res.status(503).json({
        error: {
          code: 'WEBHOOK_SECRET_NOT_CONFIGURED',
          message:
            'ESCROW_WEBHOOK_SECRET obligatorio en producción; webhook rechazado',
        },
      });
    }
    return next();
  }
  const provided =
    req.headers['x-webhook-secret'] ||
    req.headers['x-escrow-webhook-secret'];
  if (!secretsEqual(env.escrowWebhookSecret, provided)) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Firma/secret de webhook inválido o ausente',
      },
    });
  }
  next();
}
