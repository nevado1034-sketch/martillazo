import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createBidsRouter(controller) {
  const router = Router();

  // POST /api/auctions/:auctionId/place
  router.post('/:auctionId/place', authenticate, controller.placeBid);

  return router;
}
