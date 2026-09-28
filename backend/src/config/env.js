import 'dotenv/config';

const DEV_JWT_FALLBACK = 'dev-only-secret';
const rawJwtSecret = process.env.JWT_SECRET;
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

if (isProduction) {
  if (!rawJwtSecret || rawJwtSecret === DEV_JWT_FALLBACK) {
    console.error(
      '[bootstrap] JWT_SECRET es obligatorio en producción y no puede ser "dev-only-secret".',
    );
    process.exit(1);
  }
  if (rawJwtSecret.length < 32) {
    console.error(
      '[bootstrap] JWT_SECRET en producción debe tener al menos 32 caracteres.',
    );
    process.exit(1);
  }
}

/** Correos admin (lista separada por comas). Complementa role=ADMIN en JWT. */
function parseAdminEmails(raw) {
  return String(raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/martillazo',
  redisUrl: process.env.REDIS_URL,
  jwtSecret: rawJwtSecret ?? DEV_JWT_FALLBACK,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'MOCK',
  /** Comisión PulgasYa sobre el monto en custodia (vendedor recibe 100% − esto). */
  pulgasyaCommissionPercent: Number(
    process.env.PULGASYA_COMMISSION_PERCENT ?? 10,
  ),
  /**
   * Pago sandbox HTTP: bloqueado en producción.
   * En no-prod se permite salvo ENABLE_SANDBOX_PAY=false.
   */
  sandboxPayEnabled:
    !isProduction && process.env.ENABLE_SANDBOX_PAY !== 'false',
  /** Secret para cron/job POST /api/escrow/jobs/auto-release (header X-Job-Secret). */
  jobSecret: process.env.JOB_SECRET ?? '',
  /**
   * Secret para POST /api/escrow/webhooks/provider (header X-Webhook-Secret).
   * En producción, si falta → se rechazan todos los webhooks (body abierto).
   */
  escrowWebhookSecret: process.env.ESCROW_WEBHOOK_SECRET ?? '',
  /** Allowlist de emails con privilegio de mediación (además de role ADMIN). */
  adminEmails: parseAdminEmails(process.env.ADMIN_EMAILS),
  /**
   * Seed demo (solo referencia para scripts/docs). Las migraciones SQL no leen
   * env: en prod no aplicar `database/seed_pulgasya_demo.sql`. Default false en prod.
   */
  seedDemo:
    process.env.SEED_DEMO === 'true' ||
    (!isProduction && process.env.SEED_DEMO !== 'false'),
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
  supportEmail: process.env.SUPPORT_EMAIL ?? 'soporte@pulgasya.com',
};
