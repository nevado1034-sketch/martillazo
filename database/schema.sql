-- =============================================================================
-- MARTILLAZO — Plataforma P2P de subastas
-- Schema de base de datos · PostgreSQL 15+
--
-- Flujo STANDARD  : Cachivaches (escrow + liberación tras entrega física).
-- Flujo PREMIUM   : Bienes Raíces / Autos (KYC estricto, Sunarp, garantía en
--                   tarjeta de crédito y cierre notarial offline).
--
-- Fuente de verdad: PostgreSQL. Redis guarda SOLO el estado "caliente" de las
-- subastas (precio vigente y cuenta regresiva) para lecturas en tiempo real.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;        -- emails sin sensibilidad a mayúsculas
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- búsqueda textual (trigramas)

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------
CREATE TYPE user_role          AS ENUM ('USER', 'ADMIN', 'SUPPORT');
CREATE TYPE kyc_status         AS ENUM ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE document_type      AS ENUM ('DNI', 'CE', 'PASAPORTE');
CREATE TYPE account_flow       AS ENUM ('STANDARD', 'PREMIUM');
CREATE TYPE product_condition  AS ENUM ('NEW', 'LIKE_NEW', 'USED', 'REFURBISHED', 'DEFECTIVE');
CREATE TYPE product_status     AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE category_type      AS ENUM ('CACHIVACHES', 'BIENES_RAICES');
CREATE TYPE auction_status     AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CLOSED', 'AWARDED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE bid_status         AS ENUM ('PLACED', 'OUTBID', 'WON', 'REFUNDED');
CREATE TYPE escrow_status      AS ENUM ('CREATED', 'FUNDED', 'HELD', 'RELEASED_TO_SELLER', 'REFUNDED_TO_BUYER', 'DISPUTED');
CREATE TYPE txn_type           AS ENUM ('ESCROW_DEPOSIT', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'PLATFORM_FEE', 'GUARANTEE_HOLD', 'GUARANTEE_RELEASE');
CREATE TYPE txn_status         AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- -----------------------------------------------------------------------------
-- Helper: actualización automática de updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1) USUARIOS
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT        NOT NULL,
  password_hash    TEXT          NOT NULL,
  full_name        TEXT          NOT NULL,
  phone            TEXT,
  document_type    document_type,
  document_number  TEXT,
  kyc_status       kyc_status    NOT NULL DEFAULT 'NOT_STARTED',
  kyc_completed_at TIMESTAMPTZ,
  role             user_role     NOT NULL DEFAULT 'USER',
  avatar_url       TEXT,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email    UNIQUE (email),
  CONSTRAINT uq_users_document UNIQUE (document_type, document_number)
);

CREATE INDEX idx_users_kyc        ON users (kyc_status);
CREATE INDEX idx_users_active     ON users (is_active) WHERE is_active;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) KYC — verificación de identidad (obligatoria en flujo PREMIUM)
-- -----------------------------------------------------------------------------
CREATE TABLE kyc_verifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type      document_type NOT NULL,
  document_number    TEXT          NOT NULL,
  front_image_url    TEXT,
  back_image_url     TEXT,
  selfie_image_url   TEXT,
  biometric_provider TEXT,                 -- p.ej. 'reniec-biometria', 'identidad-peru'
  biometric_status   kyc_status    NOT NULL DEFAULT 'PENDING',
  status             kyc_status    NOT NULL DEFAULT 'PENDING',
  rejection_reason   TEXT,
  verified_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_kyc_document UNIQUE (user_id, document_type, document_number)
);

CREATE INDEX idx_kyc_user   ON kyc_verifications (user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications (status);

CREATE TRIGGER trg_kyc_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) CATEGORÍAS — dos grandes tipos: CACHIVACHES vs BIENES_RAICES
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID REFERENCES categories(id),
  name       TEXT          NOT NULL,
  slug       TEXT          NOT NULL,
  type       category_type NOT NULL,
  icon       TEXT,
  sort_order INT           NOT NULL DEFAULT 0,
  is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_categories_slug UNIQUE (slug)
);

CREATE INDEX idx_categories_type ON categories (type) WHERE is_active;

-- -----------------------------------------------------------------------------
-- 4) PRODUCTOS — el bien a subastar (cualquier flujo)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID             NOT NULL REFERENCES users(id),
  category_id       UUID             REFERENCES categories(id),
  title             TEXT             NOT NULL,
  description       TEXT,
  product_condition product_condition NOT NULL DEFAULT 'USED',
  base_price        NUMERIC(14,2)    NOT NULL CHECK (base_price >= 0),
  photos            JSONB            NOT NULL DEFAULT '[]',  -- máx. 10 URLs
  status            product_status   NOT NULL DEFAULT 'DRAFT',
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT chk_photos_count CHECK (jsonb_array_length(photos) <= 10)
);

CREATE INDEX idx_products_seller ON products (seller_id);
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_title_trgm ON products USING gin (title gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 5) SUNARP — Partida Registral (flujo PREMIUM: inmuebles/vehículos)
-- -----------------------------------------------------------------------------
CREATE TABLE sunarp_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  partida_registral         TEXT        NOT NULL,
  official_certificate_url  TEXT        NOT NULL,
  property_type             TEXT,             -- 'DEPARTAMENTO' | 'CASA' | 'TERRENO' | 'VEHICULO' ...
  owner_name                TEXT,
  verified                  BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_by               UUID        REFERENCES users(id),
  verified_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sunarp_partida UNIQUE (partida_registral)
);

CREATE INDEX idx_sunarp_product ON sunarp_records (product_id);

-- -----------------------------------------------------------------------------
-- 6) SUBASTAS — la subasta en vivo
--    top_bid_id / winner_id / winning_bid_id se habilitan después de crear
--    la tabla de pujas (FK circular).
-- -----------------------------------------------------------------------------
CREATE TABLE auctions (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id            UUID           NOT NULL REFERENCES users(id),
  flow                 account_flow   NOT NULL,
  status               auction_status NOT NULL DEFAULT 'PENDING',
  starting_price       NUMERIC(14,2)  NOT NULL CHECK (starting_price >= 0),
  current_price        NUMERIC(14,2),
  min_increment        NUMERIC(14,2)  NOT NULL DEFAULT 0.50 CHECK (min_increment > 0),
  top_bid_id           UUID,                          -- FK -> bids.id (ALTER abajo)
  starts_at            TIMESTAMPTZ    NOT NULL,
  ends_at              TIMESTAMPTZ    NOT NULL,
  extended_until       TIMESTAMPTZ,                   -- anti-snipe (puja en los últimos N segundos)
  anti_snipe_seconds   INT            NOT NULL DEFAULT 60,
  platform_fee_rate    NUMERIC(5,4)   NOT NULL DEFAULT 0.0500,   -- 5% para STANDARD
  escrow_id            UUID,                          -- FK -> escrow_accounts.id (ALTER abajo)
  winner_id            UUID,                          -- FK -> users.id
  winning_bid_id       UUID,                          -- FK -> bids.id
  notary_closure_deadline TIMESTAMPTZ,                -- plazo de firma notarial (PREMIUM)
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT chk_auction_dates      CHECK (ends_at > starts_at),
  CONSTRAINT chk_current_price_min  CHECK (current_price IS NULL OR current_price >= starting_price),
  CONSTRAINT chk_premium_notary     CHECK (flow = 'STANDARD' OR notary_closure_deadline IS NOT NULL),
  CONSTRAINT chk_premium_escrow     CHECK (flow = 'STANDARD' OR escrow_id IS NOT NULL)
);

CREATE INDEX idx_auctions_status_ends ON auctions (status, ends_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_auctions_seller     ON auctions (seller_id);
CREATE INDEX idx_auctions_product    ON auctions (product_id);
CREATE INDEX idx_auctions_flow       ON auctions (flow) WHERE status = 'ACTIVE';

CREATE TRIGGER trg_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 7) PUJAS — registro histórico e inmutable de cada oferta
-- -----------------------------------------------------------------------------
CREATE TABLE bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id        UUID         NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id         UUID         NOT NULL REFERENCES users(id),
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  bid_status        bid_status   NOT NULL DEFAULT 'PLACED',
  client_created_at TIMESTAMPTZ,          -- hora del dispositivo (control anti-deriva de reloj)
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_auction_amount ON bids (auction_id, amount DESC);
CREATE INDEX idx_bids_auction_time   ON bids (auction_id, created_at DESC);
CREATE INDEX idx_bids_bidder         ON bids (bidder_id);

-- FK circulares de auctions
ALTER TABLE auctions
  ADD CONSTRAINT fk_auctions_top_bid     FOREIGN KEY (top_bid_id)     REFERENCES bids(id),
  ADD CONSTRAINT fk_auctions_winning_bid FOREIGN KEY (winning_bid_id) REFERENCES bids(id),
  ADD CONSTRAINT fk_auctions_winner      FOREIGN KEY (winner_id)      REFERENCES users(id);

-- -----------------------------------------------------------------------------
-- 8) ESCROW — cuenta de custodia (flujo STANDARD)
-- -----------------------------------------------------------------------------
CREATE TABLE escrow_accounts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id),
  provider            TEXT          NOT NULL DEFAULT 'STRIPE',
  provider_account_id TEXT,
  balance             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status              escrow_status NOT NULL DEFAULT 'CREATED',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uq_escrow_provider UNIQUE (user_id, provider, provider_account_id)
);

CREATE INDEX idx_escrow_user ON escrow_accounts (user_id);

CREATE TRIGGER trg_escrow_updated_at
  BEFORE UPDATE ON escrow_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FK de auctions -> escrow_accounts (se declara aquí para romper la referencia circular)
ALTER TABLE auctions
  ADD CONSTRAINT fk_auctions_escrow FOREIGN KEY (escrow_id) REFERENCES escrow_accounts(id);

-- -----------------------------------------------------------------------------
-- 9) TRANSACCIONES — movimiento financiero auditable
-- -----------------------------------------------------------------------------
CREATE TABLE escrow_transactions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id         UUID         NOT NULL REFERENCES escrow_accounts(id),
  auction_id        UUID         REFERENCES auctions(id),
  type              txn_type     NOT NULL,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status            txn_status   NOT NULL DEFAULT 'PENDING',
  provider_reference TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_escrow   ON escrow_transactions (escrow_id);
CREATE INDEX idx_txn_auction  ON escrow_transactions (auction_id);
CREATE INDEX idx_txn_status   ON escrow_transactions (status);

CREATE TRIGGER trg_txn_updated_at
  BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 10) GARANTÍA PREMIUM — retención en tarjeta de crédito para habilitar la puja
-- -----------------------------------------------------------------------------
CREATE TABLE guarantee_holds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES users(id),
  auction_id         UUID          NOT NULL REFERENCES auctions(id),
  card_brand         TEXT,
  masked_card_number TEXT,
  authorization_code TEXT,
  amount             NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status             txn_status    NOT NULL DEFAULT 'PENDING',
  released_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_guarantee_user    ON guarantee_holds (user_id);
CREATE INDEX idx_guarantee_auction ON guarantee_holds (auction_id);

-- -----------------------------------------------------------------------------
-- 11) CONFIRMACIÓN DE ENTREGA — libera el escrow (flujo STANDARD)
-- -----------------------------------------------------------------------------
CREATE TABLE delivery_confirmations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id            UUID        NOT NULL REFERENCES auctions(id),
  buyer_id              UUID        NOT NULL REFERENCES users(id),
  seller_id             UUID        NOT NULL REFERENCES users(id),
  buyer_confirmed       BOOLEAN     NOT NULL DEFAULT FALSE,
  buyer_confirmed_at    TIMESTAMPTZ,
  seller_confirmed      BOOLEAN     NOT NULL DEFAULT FALSE,
  seller_confirmed_at   TIMESTAMPTZ,
  dispute_opened        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delivery_auction UNIQUE (auction_id)
);

CREATE INDEX idx_delivery_buyer  ON delivery_confirmations (buyer_id) WHERE NOT buyer_confirmed;
CREATE INDEX idx_delivery_seller ON delivery_confirmations (seller_id) WHERE NOT seller_confirmed;

-- -----------------------------------------------------------------------------
-- 12) CIERRE NOTARIAL — cierre legal offline (flujo PREMIUM)
-- -----------------------------------------------------------------------------
CREATE TABLE notarial_closures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id   UUID        NOT NULL REFERENCES auctions(id),
  notary_name  TEXT,
  notary_registry TEXT,
  deed_url     TEXT,
  deadline     TIMESTAMPTZ NOT NULL,
  signed_at    TIMESTAMPTZ,
  status       txn_status  NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notarial_auction UNIQUE (auction_id)
);

CREATE INDEX idx_notarial_deadline ON notarial_closures (deadline) WHERE signed_at IS NULL;

-- -----------------------------------------------------------------------------
-- 13) AUDITORÍA LEGAL — registro inmutable de acciones relevantes
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  action      TEXT   NOT NULL,               -- p.ej. 'BID_PLACED', 'ESCROW_RELEASED', 'KYC_VERIFIED'
  entity_type TEXT   NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_actor  ON audit_logs (actor_id);
CREATE INDEX idx_audit_action ON audit_logs (action);

-- -----------------------------------------------------------------------------
-- 14) VISTA ÚTIL — listado de subastas activas para el Home
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_auctions_listing AS
SELECT
  a.id,
  a.flow,
  a.status,
  a.starting_price,
  a.current_price,
  a.min_increment,
  a.ends_at,
  a.extended_until,
  COALESCE(a.extended_until, a.ends_at) AS live_ends_at,
  p.id            AS product_id,
  p.title,
  p.photos,
  p.product_condition,
  c.name          AS category,
  c.type          AS category_type,
  u.id            AS seller_id,
  u.full_name     AS seller_name
FROM auctions a
JOIN products p      ON p.id = a.product_id
LEFT JOIN categories c ON c.id = p.category_id
JOIN users u         ON u.id = a.seller_id
WHERE a.status = 'ACTIVE';

-- -----------------------------------------------------------------------------
-- 15) SEED — categorías base
-- -----------------------------------------------------------------------------
INSERT INTO categories (name, slug, type, sort_order) VALUES
  ('Juguetes y Coleccionables',  'juguetes-coleccionables', 'CACHIVACHES',   10),
  ('Tecnología y Celulares',     'tecnologia-celulares',    'CACHIVACHES',   20),
  ('Moda y Ropa',                'moda-ropa',               'CACHIVACHES',   30),
  ('Hogar y Decoración',         'hogar-decoracion',        'CACHIVACHES',   40),
  ('Herramientas y Taller',      'herramientas-taller',     'CACHIVACHES',   50),
  ('Libros y Música',            'libros-musica',           'CACHIVACHES',   60),
  ('Departamentos',              'departamentos',           'BIENES_RAICES', 10),
  ('Casas y Chalets',            'casas-chalets',           'BIENES_RAICES', 20),
  ('Terrenos',                   'terrenos',                'BIENES_RAICES', 30),
  ('Vehículos y Camionetas',     'vehiculos-camionetas',    'BIENES_RAICES', 40),
  ('Motos y Cuatrimotos',        'motos-cuatrimotos',       'BIENES_RAICES', 50)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
