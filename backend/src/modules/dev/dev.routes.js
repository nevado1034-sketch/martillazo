import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * Rutas SOLO para desarrollo: emiten un token JWT para los usuarios demo del
 * seed (seed_demo.sql) y permiten probar pujas y pagos sin implementar aún
 * el módulo de autenticación completo.
 */
export function createDevRouter() {
  const router = Router();

  // POST /api/dev/demo-token?user=vendedor|comprador
  router.post('/demo-token', (req, res) => {
    const { user = 'comprador' } = req.body ?? {};
    const demoUsers = {
      comprador: '10000000-0000-0000-0000-000000000002',
      vendedor: '10000000-0000-0000-0000-000000000001',
      admin: '10000000-0000-0000-0000-000000000003',
    };
    const userId = demoUsers[user];
    if (!userId) {
      return res.status(422).json({
        error: { code: 'UNKNOWN_DEMO_USER', message: `Usuario demo no existe: ${user}` },
      });
    }
    const token = jwt.sign({ sub: userId, role: 'USER' }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
    return res.json({ data: { token, userId, expiresIn: env.jwtExpiresIn } });
  });

  return router;
}
