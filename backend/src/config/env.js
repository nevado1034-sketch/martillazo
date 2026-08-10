import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/martillazo',
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'MOCK',
};
