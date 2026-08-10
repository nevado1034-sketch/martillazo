import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createWalletRouter(controller) {
  const router = Router();

  // GET /api/wallet — saldo, retenciones y movimientos de la billetera.
  router.get('/', authenticate, controller.getState);

  // POST /api/wallet/topup — recarga por YAPE, PLIN o CARD.
  router.post('/topup', authenticate, controller.topup);

  return router;
}
