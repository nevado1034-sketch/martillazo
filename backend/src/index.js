import { createApp } from './app.js';
import { env } from './config/env.js';
import { pingDatabase, pool } from './db/pool.js';
import { AuctionService } from './modules/auctions/auctions.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { BidService } from './modules/bids/bids.service.js';
import { CommissionService } from './modules/payments/commissions.service.js';
import { GuaranteeService } from './modules/payments/guarantees.service.js';
import { PaymentService } from './modules/payments/payments.service.js';
import { SettlementService } from './modules/settlements/settlements.service.js';
import { WalletService } from './modules/wallet/wallet.service.js';
import { getPaymentProvider } from './modules/payments/providers/index.js';
import { createCache } from './redis/cache.js';
import { createSocketServer } from './sockets/index.js';
import { AuctionCloser } from './jobs/auctionCloser.js';
import { ListingsService } from './modules/listings/listings.service.js';

async function main() {
  await pingDatabase();
  console.log('[db] conexión a PostgreSQL verificada');

  const cache = createCache();

  const auctionService = new AuctionService({ pool });
  const authService = new AuthService({ pool });
  const listingsService = new ListingsService({ pool });

  const provider = getPaymentProvider(env.paymentProvider);
  const commissionService = new CommissionService({ pool });
  const paymentService = new PaymentService({ pool, provider, commissionService });
  const guaranteeService = new GuaranteeService({ pool, provider });
  const settlementService = new SettlementService({ pool, paymentService });
  const walletService = new WalletService({ pool, provider });

  const bidService = new BidService({ pool, cache, walletService });

  const app = createApp({
    auctionService,
    bidService,
    paymentService,
    guaranteeService,
    settlementService,
    walletService,
    authService,
    listingsService,
  });
  const { httpServer, io } = createSocketServer(app, { bidService });

  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(
      `[server] PulgasYa API + WebSockets en http://0.0.0.0:${env.port}`,
    );
  });

  const closer = new AuctionCloser({ pool, walletService }).start();

  const shutdown = async () => {
    console.log('\n[server] cerrando...');
    closer.stop();
    await io.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[bootstrap] error fatal', err);
  process.exit(1);
});
