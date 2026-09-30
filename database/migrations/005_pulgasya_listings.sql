-- PulgasYa: anuncios híbridos (productos | servicios) + ofertas
BEGIN;

CREATE TABLE IF NOT EXISTS pulgasya_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT          NOT NULL CHECK (type IN ('producto', 'servicio')),
  title           TEXT          NOT NULL,
  description     TEXT          NOT NULL DEFAULT '',
  price           NUMERIC(12,2) NOT NULL CHECK (price > 0),
  currency        TEXT          NOT NULL DEFAULT 'PEN',
  price_mode      TEXT          CHECK (price_mode IS NULL OR price_mode IN ('fijo', 'hora', 'desde')),
  category        TEXT          NOT NULL,
  location        TEXT          NOT NULL,
  condition       TEXT,
  negotiable      BOOLEAN       NOT NULL DEFAULT TRUE,
  shipping        TEXT,
  zone            TEXT,
  available_today BOOLEAN       NOT NULL DEFAULT FALSE,
  images          JSONB         NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT          NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'sold', 'archived')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_type ON pulgasya_listings (type);
CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_status ON pulgasya_listings (status);
CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_seller ON pulgasya_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_created ON pulgasya_listings (created_at DESC);

DROP TRIGGER IF EXISTS trg_pulgasya_listings_updated_at ON pulgasya_listings;
CREATE TRIGGER trg_pulgasya_listings_updated_at
  BEFORE UPDATE ON pulgasya_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pulgasya_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID          NOT NULL REFERENCES pulgasya_listings(id) ON DELETE CASCADE,
  buyer_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  message     TEXT          NOT NULL DEFAULT '',
  status      TEXT          NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_pulgasya_offer_buyer UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_pulgasya_offers_listing ON pulgasya_offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_pulgasya_offers_buyer ON pulgasya_offers (buyer_id);

-- Demo user + listings: NO insertar aquí en producción.
-- Local/dev only: psql "$DATABASE_URL" -f database/seed_pulgasya_demo.sql
-- (respetar SEED_DEMO=false / NODE_ENV=production — no aplicar ese seed en prod)

COMMIT;
