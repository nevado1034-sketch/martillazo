import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';

export function createListingsRouter(controller) {
  const router = Router();

  router.get('/', controller.list);
  // Antes de /:id para no capturar "related" como UUID
  router.get('/related', controller.relatedQuery);
  router.get('/:id/related', controller.relatedForListing);
  router.get('/:id', optionalAuth, controller.get);
  router.post('/', authenticate, controller.create);
  router.get('/:id/offers', authenticate, controller.listOffers);
  router.post('/:id/offers', authenticate, controller.createOffer);
  router.patch(
    '/offers/:offerId',
    authenticate,
    controller.respondOffer,
  );

  return router;
}

export function createMyPulgasyaRouter(controller) {
  const router = Router();
  router.get('/listings', authenticate, controller.myListings);
  router.get('/offers', authenticate, controller.myOffers);
  router.get('/sales', authenticate, controller.mySales);
  return router;
}
