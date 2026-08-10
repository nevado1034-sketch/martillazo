import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createAuthRouter(controller) {
  const router = Router();

  // POST /api/auth/social/:provider — login/registro con Google o Facebook (mock en dev)
  router.post('/social/:provider', controller.socialLogin);

  // GET /api/auth/me — perfil del cliente autenticado
  router.get('/me', authenticate, controller.me);

  // PATCH /api/auth/me — editar datos del perfil
  router.patch('/me', authenticate, controller.updateMe);

  // POST /api/auth/kyc — solicitar verificación de identidad
  router.post('/kyc', authenticate, controller.requestKyc);

  return router;
}
