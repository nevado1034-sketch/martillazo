-- PulgasYa: órdenes con custodia (escrow) + libro mayor
-- Estados: pending_payment → held → shipped → delivered → released | refunded | disputed

BEGIN;

CREATE TABLE IF NOT EXISTS pulgasya_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           UUID NOT NULL REFERENCES pulgasya_listings(id),
  offer_id             UUID REFERENCES pulgasya_offers(id) ON DELETE SET NULL,
  buyer_id             UUID NOT NULL REFERENCES users(id),
  seller_id            UUID NOT NULL REFERENCES users(id),
  amount_cents         BIGINT NOT NULL CHECK (amount_cents > 0),
  currency             CHAR(3) NOT NULL DEFAULT 'PEN',
  commission_percent   NUMERIC(5,2) NOT NULL DEFAULT 10,
  commission_cents     BIGINT NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  net_to_seller_cents  BIGINT NOT NULL DEFAULT 0 CHECK (net_to_seller_cents >= 0),
  status               TEXT NOT NULL DEFAULT 'pending_payment',
  payment_provider     TEXT NOT NULL DEFAULT 'SANDBOX',
  payment_ref          TEXT,
  sandbox_label        TEXT DEFAULT 'Pago simulado — sandbox PulgasYa',
  paid_at              TIMESTAMPTZ,
  shipped_at           TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  release_due_at       TIMESTAMPTZ,
  buyer_confirmed_at   TIMESTAMPTZ,
  released_at          TIMESTAMPTZ,
  disputed_at          TIMESTAMPTZ,
  dispute_reason       TEXT,
  refunded_at          TIMESTAMPTZ,
  mediation_note       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pulgasya_order_status CHECK (
    status IN (
      'pending_payment',
      'held',
      'shipped',
      'delivered',
      'released',
      'refunded',
      'disputed'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pulgasya_orders_active_offer
  ON pulgasya_orders (offer_id)
  WHERE offer_id IS NOT NULL
    AND status NOT IN ('refunded');

CREATE INDEX IF NOT EXISTS idx_pulgasya_orders_buyer ON pulgasya_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_pulgasya_orders_seller ON pulgasya_orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_pulgasya_orders_status ON pulgasya_orders (status);
CREATE INDEX IF NOT EXISTS idx_pulgasya_orders_release_due
  ON pulgasya_orders (release_due_at)
  WHERE status = 'delivered';

CREATE TRIGGER trg_pulgasya_orders_updated_at
  BEFORE UPDATE ON pulgasya_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pulgasya_escrow_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES pulgasya_orders(id) ON DELETE CASCADE,
  entry_type     TEXT NOT NULL,
  amount_cents   BIGINT NOT NULL,
  balance_bucket TEXT NOT NULL,
  user_id        UUID REFERENCES users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ledger_entry CHECK (
    entry_type IN (
      'HOLD',
      'RELEASE_SELLER',
      'COMMISSION',
      'REFUND',
      'ADJUSTMENT'
    )
  ),
  CONSTRAINT chk_ledger_bucket CHECK (
    balance_bucket IN (
      'platform_escrow',
      'seller_payable',
      'platform_revenue',
      'buyer'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_pulgasya_ledger_order
  ON pulgasya_escrow_ledger (order_id);

COMMENT ON TABLE pulgasya_orders IS
  'Órdenes marketplace PulgasYa con custodia. El pago NO va al vendedor hasta release.';
COMMENT ON COLUMN pulgasya_orders.release_due_at IS
  'Inicio del reloj: delivered_at + 24h. No desde el pago.';
COMMENT ON TABLE pulgasya_escrow_ledger IS
  'Libro mayor sandbox/prod de custodia PulgasYa (sin PAN/CVV).';

COMMIT;
