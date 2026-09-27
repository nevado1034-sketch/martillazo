import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createListingsRouter(controller) {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', authenticate, controller.create);
  router.get('/:id/offers', authenticate, controller.listOffers);
  router.post('/:id/offers', authenticate, controller.createOffer);

  return router;
}

export function createMyPulgasyaRouter(controller) {
  const router = Router();
  router.get('/listings', authenticate, controller.myListings);
  router.get('/offers', authenticate, controller.myOffers);
  return router;
}
