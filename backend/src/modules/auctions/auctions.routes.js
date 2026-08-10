import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createAuctionsRouter(controller) {
  const router = Router();

  // GET /api/auctions?flow=STANDARD|PREMIUM&q=...&limit=...
  router.get('/', controller.listActive);

  // POST /api/auctions — crea producto + subasta (requiere sesión)
  router.post('/', authenticate, controller.create);

  // GET /api/auctions/:auctionId/bidders — postores (solo el dueño)
  router.get('/:auctionId/bidders', authenticate, controller.getBidders);

  // GET /api/auctions/:auctionId — detalle público (producto, vendedor, historial)
  router.get('/:auctionId', controller.getById);

  return router;
}

export function createMyAuctionsRouter(controller) {
  const router = Router();

  // GET /api/my/auctions — panel del vendedor (sus publicaciones)
  router.get('/auctions', authenticate, controller.listMine);

  // PATCH /api/my/auctions/:auctionId — editar publicación (precio, título, fotos, video)
  router.patch('/auctions/:auctionId', authenticate, controller.updateMine);

  // DELETE /api/my/auctions/:auctionId — eliminar publicación en vivo sin pujas
  router.delete('/auctions/:auctionId', authenticate, controller.deleteMine);

  // GET /api/my/bids — pujas del cliente (mis pujas)
  router.get('/bids', authenticate, controller.listMyBids);

  return router;
}

export function createCategoriesRouter(controller) {
  const router = Router();

  // GET /api/categories — catálogo para el formulario de alta
  router.get('/', controller.listCategories);

  return router;
}
