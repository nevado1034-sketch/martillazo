-- =============================================================================
-- MARTILLAZO — Billetera (Yape/Plin/Tarjeta) y garantía de puja STANDARD
-- Migration 003 (aplicar después de 002_payments_escrow.sql)
--
-- Modelo: el postor recarga su billetera; al pujar en una subasta STANDARD
-- se retiene un depósito fijo (S/10) que "asegura" el producto. Si gana, el
-- depósito se aplica al pago final (DOWN_PAYMENT al vendedor); si pierde, se
-- libera la disponibilidad; si gana y no paga, se cobra como penalidad.
-- =============================================================================

-- 1) CUENTA DE BILLETERA — saldo real por usuario
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id),
  currency      CHAR(3)     NOT NULL DEFAULT 'PEN',
  balance_cents BIGINT      NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_wallet_user UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallet_user ON wallet_accounts (user_id);

CREATE TRIGGER trg_wallet_accounts_updated_at
  BEFORE UPDATE ON wallet_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2) MOVIMIENTOS DE BILLETERA — libro de recargas y débitos
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id),
  type               TEXT        NOT NULL,   -- TOPUP | APPLIED | PENALTY | PAYMENT
  status             TEXT        NOT NULL DEFAULT 'COMPLETED',
  amount_cents       BIGINT      NOT NULL CHECK (amount_cents > 0),
  currency           CHAR(3)     NOT NULL DEFAULT 'PEN',
  method             TEXT,                   -- YAPE | PLIN | CARD | WALLET
  provider_reference TEXT,
  auction_id         UUID        REFERENCES auctions(id),
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_txn_user    ON wallet_transactions (user_id, created_at DESC);
CREATE INDEX idx_wallet_txn_auction ON wallet_transactions (auction_id);

-- 3) RETENCIONES DE GARANTÍA — depósito que habilita la puja
CREATE TABLE IF NOT EXISTS wallet_holds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id),
  auction_id   UUID        NOT NULL REFERENCES auctions(id),
  amount_cents BIGINT      NOT NULL CHECK (amount_cents > 0),
  currency     CHAR(3)     NOT NULL DEFAULT 'PEN',
  status       TEXT        NOT NULL DEFAULT 'HELD',  -- HELD | APPLIED | RELEASED | PENALTY
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- Una sola retención activa por (postor, subasta).
CREATE UNIQUE INDEX uq_wallet_hold_active
  ON wallet_holds (user_id, auction_id) WHERE status = 'HELD';

CREATE INDEX idx_wallet_hold_auction ON wallet_holds (auction_id, status);
