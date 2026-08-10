-- =============================================================================
-- MARTILLAZO — Motor de pagos, comisiones y custodia (Escrow)
-- Migration 002 (aplicar después de schema.sql)
--
-- NOTA: este archivo NO se envuelve en una transacción explícita. PostgreSQL
-- no permite USAR valores enum recién creados hasta que su ADD VALUE haga
-- commit; al ejecutar cada sentencia de forma autónoma (psql auto-commit),
-- los ALTER TYPE quedan confirmados antes de crear los índices que los usan.

-- -----------------------------------------------------------------------------
-- Nuevos valores de estado y tipos de transacción
-- -----------------------------------------------------------------------------
ALTER TYPE txn_type   ADD VALUE IF NOT EXISTS 'PAYMENT';
ALTER TYPE txn_type   ADD VALUE IF NOT EXISTS 'PAYOUT';
ALTER TYPE txn_type   ADD VALUE IF NOT EXISTS 'PENALTY';
ALTER TYPE txn_type   ADD VALUE IF NOT EXISTS 'DOWN_PAYMENT';
ALTER TYPE txn_type   ADD VALUE IF NOT EXISTS 'PUBLICATION_FEE';

ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'HOLD_ESCROW';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'HELD';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'RELEASED';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE txn_status ADD VALUE IF NOT EXISTS 'PENALTY_CHARGED';

-- -----------------------------------------------------------------------------
-- 1) REGLAS DE COMISIÓN (data-driven)
--    CACHIVACHES  : 8% sobre valor final (vendedor paga al completarse la venta)
--    BIENES_RAICES: $50 USD fijo por publicar (SUNARP) + 1.5% con tope $3,000 USD
-- -----------------------------------------------------------------------------
CREATE TABLE commission_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type      category_type NOT NULL,
  rate               NUMERIC(6,4)   NOT NULL CHECK (rate >= 0),
  fixed_fee_cents    BIGINT         NOT NULL DEFAULT 0 CHECK (fixed_fee_cents >= 0),
  fixed_fee_currency CHAR(3),
  cap_cents          BIGINT         CHECK (cap_cents IS NULL OR cap_cents > 0),
  cap_currency       CHAR(3),
  tax_rate           NUMERIC(6,4)   NOT NULL DEFAULT 0.18 CHECK (tax_rate >= 0),
  is_active          BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_commission_rules_category UNIQUE (category_type)
);

CREATE TRIGGER trg_commission_rules_updated_at
  BEFORE UPDATE ON commission_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO commission_rules
  (category_type, rate, fixed_fee_cents, fixed_fee_currency, cap_cents, cap_currency, tax_rate)
VALUES
  ('CACHIVACHES',   0.0800, 0,     NULL, NULL,    NULL,    0.1800),
  ('BIENES_RAICES', 0.0150, 5000,  'USD', 300000, 'USD',   0.1800)
ON CONFLICT (category_type) DO UPDATE
  SET rate = EXCLUDED.rate,
      fixed_fee_cents = EXCLUDED.fixed_fee_cents,
      fixed_fee_currency = EXCLUDED.fixed_fee_currency,
      cap_cents = EXCLUDED.cap_cents,
      cap_currency = EXCLUDED.cap_currency,
      tax_rate = EXCLUDED.tax_rate;

-- -----------------------------------------------------------------------------
-- 2) TRANSACCIONES — libro mayor de pagos (brutos, comisión, impuestos, neto)
-- -----------------------------------------------------------------------------
CREATE TABLE transacciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key     TEXT,                       -- evita cobros duplicados
  auction_id          UUID          NOT NULL REFERENCES auctions(id),
  buyer_id            UUID          NOT NULL REFERENCES users(id),
  seller_id           UUID          REFERENCES users(id),
  type                txn_type      NOT NULL,
  status              txn_status    NOT NULL DEFAULT 'PENDING',
  currency            CHAR(3)       NOT NULL DEFAULT 'PEN',
  amount_cents        BIGINT        NOT NULL CHECK (amount_cents > 0),
  gross_amount_cents  BIGINT        CHECK (gross_amount_cents IS NULL OR gross_amount_cents >= 0),
  commission_cents    BIGINT        NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  tax_cents           BIGINT        NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  net_to_seller_cents BIGINT        CHECK (net_to_seller_cents IS NULL OR net_to_seller_cents >= 0),
  provider            TEXT          NOT NULL DEFAULT 'MOCK',
  provider_reference  TEXT,
  provider_error      TEXT,
  escrow_status       escrow_status,
  released_at         TIMESTAMPTZ,
  metadata            JSONB,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_transacciones_idempotency
  ON transacciones (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Una sola custodia activa por subasta (PAYMENT no reembolsado/cancelado).
CREATE UNIQUE INDEX uq_transacciones_active_payment
  ON transacciones (auction_id)
  WHERE type = 'PAYMENT' AND status NOT IN ('REFUNDED', 'CANCELLED');

CREATE INDEX idx_transacciones_auction ON transacciones (auction_id);
CREATE INDEX idx_transacciones_buyer   ON transacciones (buyer_id);
CREATE INDEX idx_transacciones_status  ON transacciones (status) WHERE status IN ('HOLD_ESCROW', 'DISPUTED');

CREATE TRIGGER trg_transacciones_updated_at
  BEFORE UPDATE ON transacciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) COMISIONES — detalle de lo cobrado a cada venta
-- -----------------------------------------------------------------------------
CREATE TABLE comisiones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID          REFERENCES transacciones(id),
  auction_id          UUID          NOT NULL REFERENCES auctions(id),
  seller_id           UUID          NOT NULL REFERENCES users(id),
  category_type       category_type NOT NULL,
  currency            CHAR(3)       NOT NULL DEFAULT 'PEN',
  gross_amount_cents  BIGINT        NOT NULL CHECK (gross_amount_cents >= 0),
  commission_rate     NUMERIC(6,4)  NOT NULL,
  commission_cents    BIGINT        NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  fixed_fee_cents     BIGINT        NOT NULL DEFAULT 0 CHECK (fixed_fee_cents >= 0),
  cap_cents           BIGINT        CHECK (cap_cents IS NULL OR cap_cents > 0),
  tax_rate            NUMERIC(6,4)  NOT NULL DEFAULT 0.18 CHECK (tax_rate >= 0),
  tax_cents           BIGINT        NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_charged_cents BIGINT        NOT NULL CHECK (total_charged_cents >= 0),
  net_to_seller_cents BIGINT        NOT NULL CHECK (net_to_seller_cents >= 0),
  status              txn_status    NOT NULL DEFAULT 'PENDING',
  charged_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_comisiones_auction  ON comisiones (auction_id);
CREATE INDEX idx_comisiones_seller   ON comisiones (seller_id);
CREATE INDEX idx_comisiones_category ON comisiones (category_type);

-- -----------------------------------------------------------------------------
-- 4) MÉTODOS DE PAGO — tarjetas tokenizadas (nunca almacenar el PAN)
-- -----------------------------------------------------------------------------
CREATE TABLE payment_methods (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID      NOT NULL REFERENCES users(id),
  provider        TEXT      NOT NULL DEFAULT 'MOCK',
  provider_token  TEXT      NOT NULL,
  card_brand      TEXT,
  masked_number   TEXT,
  cardholder_name TEXT,
  expiry_month    SMALLINT,
  expiry_year     SMALLINT,
  is_default      BOOLEAN   NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_method_token UNIQUE (provider, provider_token)
);

CREATE INDEX idx_payment_methods_user ON payment_methods (user_id) WHERE is_active;

-- -----------------------------------------------------------------------------
-- 5) GARANTÍA DE PUJA — ampliación de guarantee_holds
-- -----------------------------------------------------------------------------
ALTER TABLE guarantee_holds
  ADD COLUMN IF NOT EXISTS currency                 CHAR(3)  NOT NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS authorized_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS captured_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome                  TEXT,   -- 'LOST' | 'APPLIED' | 'PENALTY'
  ADD COLUMN IF NOT EXISTS applied_to_down_payment  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS penalty_split            JSONB;
