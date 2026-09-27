import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { AuctionsController } from './modules/auctions/auctions.controller.js';
import {
  createAuctionsRouter,
  createCategoriesRouter,
  createMyAuctionsRouter,
} from './modules/auctions/auctions.routes.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { BidsController } from './modules/bids/bids.controller.js';
import { createBidsRouter } from './modules/bids/bids.routes.js';
import { SettlementsController } from './modules/settlements/settlements.controller.js';
import { createSettlementsRouter } from './modules/settlements/settlements.routes.js';
import { GuaranteesController } from './modules/payments/guarantees.controller.js';
import { WalletController } from './modules/wallet/wallet.controller.js';
import { createWalletRouter } from './modules/wallet/wallet.routes.js';
import { createGuaranteesRouter } from './modules/payments/guarantees.routes.js';
import { PaymentsController } from './modules/payments/payments.controller.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
import { createDevRouter } from './modules/dev/dev.routes.js';
import { createUploadsRouter, MEDIA_DIR } from './modules/uploads/uploads.routes.js';
import { ListingsController } from './modules/listings/listings.controller.js';
import {
  createListingsRouter,
  createMyPulgasyaRouter,
} from './modules/listings/listings.routes.js';

export function createApp({
  auctionService,
  bidService,
  paymentService,
  guaranteeService,
  settlementService,
  walletService,
  authService,
  listingsService,
}) {
  const app = express();

  // En desarrollo se acepta cualquier origen (incluye el celular en la LAN).
  app.use(
    cors({
      origin(origin, callback) {
        if (env.nodeEnv !== 'production' || !origin) return callback(null, true);
        return callback(null, env.clientOrigin === origin);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Media subida por los vendedores (fotos y video del producto).
  app.use('/uploads', express.static(MEDIA_DIR, { maxAge: '7d' }));

  const auctionsController = new AuctionsController(auctionService);
  const bidsController = new BidsController(bidService);
  const paymentsController = new PaymentsController(paymentService);
  const guaranteesController = new GuaranteesController(guaranteeService);
  const settlementsController = new SettlementsController(settlementService);
  const walletController = new WalletController(walletService);
  const authController = new AuthController(authService);
  const listingsController = new ListingsController(listingsService);

  app.get('/health', (_req, res) =>
    res.json({ ok: true, service: 'pulgasya-api', time: new Date().toISOString() }),
  );

  app.use('/api/listings', createListingsRouter(listingsController));
  app.use('/api/me', createMyPulgasyaRouter(listingsController));

  app.use('/api/auctions', createAuctionsRouter(auctionsController));
  app.use('/api/auctions', createSettlementsRouter(settlementsController));
  app.use('/api/my', createMyAuctionsRouter(auctionsController));
  app.use('/api/wallet', createWalletRouter(walletController));
  app.use('/api/categories', createCategoriesRouter(auctionsController));
  app.use('/api/auctions', createBidsRouter(bidsController));
  app.use('/api/payments', createPaymentsRouter(paymentsController));
  app.use('/api/guarantees', createGuaranteesRouter(guaranteesController));
  app.use('/api/uploads', createUploadsRouter());
  app.use('/api/auth', createAuthRouter(authController));

  if (env.nodeEnv !== 'production') {
    app.use('/api/dev', createDevRouter());
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
