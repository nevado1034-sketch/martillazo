-- PulgasYa: perfil ampliado, preferencias, soft-delete, reset de contraseña
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS phone_visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_phone_visibility;

ALTER TABLE users
  ADD CONSTRAINT chk_users_phone_visibility
  CHECK (phone_visibility IN ('public', 'on_offer', 'nobody'));

COMMENT ON COLUMN users.display_name IS
  'Nombre para saludo Hola {NOMBRE}; si vacío se usa full_name';
COMMENT ON COLUMN users.phone_visibility IS
  'Quién ve el WhatsApp: public | on_offer | nobody';
COMMENT ON COLUMN users.payment_gateway IS
  'Preferencia de pasarela (CULQI|NIUBIZ|MERCADOPAGO) — stub, sin cobros reales';
COMMENT ON COLUMN users.deleted_at IS
  'Soft-delete / cierre de cuenta';

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires
  ON password_reset_tokens (expires_at)
  WHERE used_at IS NULL;

COMMIT;
