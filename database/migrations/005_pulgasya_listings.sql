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

-- Usuario demo (email: demo@pulgasya.com · password: pulgasya123)
INSERT INTO users (id, email, password_hash, full_name, phone, kyc_status, role)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'demo@pulgasya.com',
  'scrypt:934b152aa6ada96cb5d3697f134f0485:61d30b55bf12e5539cc4dcd64028e6dc4bcfa15f50a0aaff76be108029121eefd50b63b70e14974bb32ec3a9df016bfafe97ade08e593b908888fe44a6992802',
  'Demo PulgasYa',
  '51999888777',
  'NOT_STARTED',
  'USER'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name;

-- Seed anuncios (solo si la tabla está vacía)
INSERT INTO pulgasya_listings (
  id, seller_id, type, title, description, price, currency, price_mode,
  category, location, condition, negotiable, shipping, zone, available_today, images
)
SELECT * FROM (VALUES
  (
    'b1111111-1111-1111-1111-111111111101'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'producto',
    'Sofá 3 plazas verde oliva',
    'Sofá cómodo en buen estado. Telas lavables, sin manchas grandes. Ideal para sala. Recojo en persona o delivery a consultar.',
    650::numeric, 'PEN', NULL,
    'hogar', 'Miraflores, Lima', 'Buen estado', true, 'persona', NULL, false,
    '["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80","https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111102'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'producto',
    'Bicicleta urbana Decathlon',
    'Cuadro M, frenos en buen estado, luces incluidas. Poco uso. Candado no incluido.',
    380::numeric, 'PEN', NULL,
    'deporte', 'Surco, Lima', 'Como nuevo', true, 'persona', NULL, false,
    '["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111103'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'producto',
    'iPhone 13 128 GB',
    'Batería al 87%. Sin rayones en pantalla. Caja y cable originales. Boleta disponible.',
    1450::numeric, 'PEN', NULL,
    'tech', 'San Isidro, Lima', 'Buen estado', true, 'envio', NULL, false,
    '["https://images.unsplash.com/photo-1632661674596-df8aa3f7898a?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111104'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'producto',
    'Chaqueta de lana talla M',
    'Marca Zara, color camel. Usada dos temporadas. Sin roturas.',
    90::numeric, 'PEN', NULL,
    'moda', 'Arequipa', 'Aceptable', false, 'envio', NULL, false,
    '["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111105'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'servicio',
    'Limpieza del hogar a domicilio',
    'Limpieza profunda o mantenimiento semanal. Traigo productos ecológicos. Ideal para departamentos de 1–3 dormitorios.',
    25::numeric, 'PEN', 'hora',
    'limpieza', 'Jesús María, Lima', NULL, true, NULL, 'Hasta 8 km', true,
    '["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111106'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'servicio',
    'Clases particulares de mates',
    'Secundaria y preuniversitario. Presencial o online. Primera sesión de valoración sin compromiso.',
    40::numeric, 'PEN', 'hora',
    'clases', 'Trujillo', NULL, true, NULL, 'Presencial + online', false,
    '["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111107'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'servicio',
    'Gasfitero rápido — urgencias',
    'Fugas, desagües y grifería. Presupuesto claro antes de empezar. Disponible hoy en la zona.',
    80::numeric, 'PEN', 'desde',
    'reparaciones', 'Callao', NULL, true, NULL, 'Lima Metropolitana', true,
    '["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80"]'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111108'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'servicio',
    'Mudanza pequeña con camioneta',
    'Ideal para estudio o 1 dormitorio. 2 personas + camioneta. Embalaje opcional.',
    250::numeric, 'PEN', 'fijo',
    'mudanzas', 'Cusco', NULL, true, NULL, 'Cusco ciudad', false,
    '["https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80"]'::jsonb
  )
) AS v(
  id, seller_id, type, title, description, price, currency, price_mode,
  category, location, condition, negotiable, shipping, zone, available_today, images
)
WHERE NOT EXISTS (SELECT 1 FROM pulgasya_listings LIMIT 1);

COMMIT;
