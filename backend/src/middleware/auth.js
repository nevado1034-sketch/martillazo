import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

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
