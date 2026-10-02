-- Cuentas OAuth (Google / Facebook) vinculadas a users.
-- Instagram no ofrece Login with Instagram estándar para sitios web; no se modela.

CREATE TABLE IF NOT EXISTS user_social_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT          NOT NULL,
  provider_user_id TEXT          NOT NULL,
  email            CITEXT,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_provider CHECK (provider IN ('google', 'facebook')),
  CONSTRAINT uq_social_provider_uid UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_social_user
  ON user_social_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_user_social_email
  ON user_social_accounts (email)
  WHERE email IS NOT NULL;

COMMENT ON TABLE user_social_accounts IS
  'Vínculo OAuth: provider + provider_user_id → users. Enlace por email verificado.';
