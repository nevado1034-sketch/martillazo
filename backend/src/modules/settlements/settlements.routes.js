import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

// Montado en /api/auctions. mergeParams expone :auctionId a los handlers.
export function createSettlementsRouter(controller) {
  const router = Router({ mergeParams: true });

  // GET /api/auctions/:auctionId/delivery — estado de entrega y pago en custodia
  router.get('/:auctionId/delivery', controller.getState);

  // POST /api/auctions/:auctionId/confirm-delivery — el ganador recibe el producto
  router.post('/:auctionId/confirm-delivery', authenticate, controller.confirmDelivery);

  // POST /api/auctions/:auctionId/settle — el vendedor cierra y libera el escrow
  router.post('/:auctionId/settle', authenticate, controller.settle);

  return router;
}
