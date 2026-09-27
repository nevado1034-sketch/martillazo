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
  /** Comisión PulgasYa sobre el monto en custodia (vendedor recibe 100% − esto). */
  pulgasyaCommissionPercent: Number(
    process.env.PULGASYA_COMMISSION_PERCENT ?? 10,
  ),
  // Pasarelas (stubs — no se cobran hasta integrar SDK)
  culqiPublicKey: process.env.CULQI_PUBLIC_KEY ?? '',
  culqiSecretKey: process.env.CULQI_SECRET_KEY ?? '',
  niubizClientId: process.env.NIUBIZ_CLIENT_ID ?? '',
  niubizClientSecret: process.env.NIUBIZ_CLIENT_SECRET ?? '',
  mercadopagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '',
  // SMTP (reset de contraseña). Sin host → log en consola.
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? 'PulgasYa <noreply@pulgasya.local>',
  supportEmail: process.env.SUPPORT_EMAIL ?? 'soporte@pulgasya.local',
};
