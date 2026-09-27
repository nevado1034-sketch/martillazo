import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createEscrowRouter(controller) {
  const router = Router();

  router.get('/config', controller.config);
  router.post('/webhooks/provider', controller.webhook);
  router.post('/jobs/auto-release', controller.runAutoRelease);

  router.get('/orders', authenticate, controller.listMine);
  router.get('/orders/:id', authenticate, controller.get);
  router.post('/orders/from-offer', authenticate, controller.createFromOffer);
  router.post('/orders/buy-now', authenticate, controller.buyNow);
  router.post('/orders/:id/pay-sandbox', authenticate, controller.paySandbox);
  router.post('/orders/:id/ship', authenticate, controller.markShipped);
  router.post('/orders/:id/deliver', authenticate, controller.markDelivered);
  router.post('/orders/:id/confirm', authenticate, controller.confirm);
  router.post('/orders/:id/dispute', authenticate, controller.dispute);
  router.post('/orders/:id/mediate', authenticate, controller.mediate);

  return router;
}
