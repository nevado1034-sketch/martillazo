-- =============================================================================
-- MARTILLAZO — Seed de datos demo (desarrollo)
-- Aplicar después de schema.sql y migrations/002_payments_escrow.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Usuarios demo
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, phone, document_type, document_number, kyc_status, role)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'vendedor@martillazo.pe',   'demo-hash', 'María Vendedora',   '+51999990001', 'DNI', '40000001', 'VERIFIED', 'USER'),
  ('10000000-0000-0000-0000-000000000002', 'comprador@martillazo.pe',  'demo-hash', 'Juan Comprador',    '+51999990002', 'DNI', '40000002', 'VERIFIED', 'USER'),
  ('10000000-0000-0000-0000-000000000003', 'admin@martillazo.pe',      'demo-hash', 'Soporte Martillazo', '+51999990003', 'DNI', '40000003', 'VERIFIED', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO kyc_verifications (user_id, document_type, document_number, biometric_provider, biometric_status, status, verified_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'DNI', '40000001', 'reniec-biometria', 'VERIFIED', 'VERIFIED', now()),
  ('10000000-0000-0000-0000-000000000002', 'DNI', '40000002', 'reniec-biometria', 'VERIFIED', 'VERIFIED', now())
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Productos
-- -----------------------------------------------------------------------------
INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', c.id,
       'iPhone 13 128GB — Batería 90%', 'Gris medianoche, sin bloqueo de operador, incluye caja y cable.', 'USED', 1800.00,
       '["https://picsum.photos/seed/iphone13/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'tecnologia-celulares'
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', c.id,
       'Funko Pop Edición Limitada', 'Colección sellada, edición exclusiva de convención.', 'LIKE_NEW', 45.00,
       '["https://picsum.photos/seed/funko/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'juguetes-coleccionables'
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', c.id,
       'Zapatillas Nike Air Max', 'Talla 42, uso ligero, sin caja original.', 'USED', 320.00,
       '["https://picsum.photos/seed/nike/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'moda-ropa'
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', c.id,
       'Smart TV 55" 4K UHD', 'Pantalla sin rayas, control y soporte incluidos.', 'LIKE_NEW', 2100.00,
       '["https://picsum.photos/seed/tv4k/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'tecnologia-celulares'
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', c.id,
       'Guitarra acústica Yamaha F310', 'Buen estado, afinación perfecta, estuche rígido.', 'USED', 500.00,
       '["https://picsum.photos/seed/guitarra/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'libros-musica'
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, seller_id, category_id, title, description, product_condition, base_price, photos, status)
SELECT '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', c.id,
       'Departamento 2 dorm. Miraflores', '78 m², tercer piso con ascensor, cerca de Larco.', 'USED', 450000.00,
       '["https://picsum.photos/seed/dpto/640/480"]', 'APPROVED'
FROM categories c WHERE c.slug = 'departamentos'
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Sunarp (requisito PREMIUM) + cuenta puente del flujo premium
-- -----------------------------------------------------------------------------
INSERT INTO escrow_accounts (id, user_id, provider, provider_account_id, balance, status)
VALUES ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'INTERNAL', 'acc_demo_premium', 0, 'CREATED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sunarp_records (id, product_id, partida_registral, official_certificate_url, property_type, owner_name, verified, verified_by, verified_at)
VALUES ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006',
        '11012345', 'https://example.com/cert-sunarp.pdf', 'DEPARTAMENTO', 'María Vendedora', TRUE,
        '10000000-0000-0000-0000-000000000003', now())
ON CONFLICT (partida_registral) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Subastas activas
-- -----------------------------------------------------------------------------
INSERT INTO auctions (id, product_id, seller_id, flow, status, starting_price, current_price, min_increment, starts_at, ends_at, escrow_id, notary_closure_deadline)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'STANDARD', 'ACTIVE', 1800.00, 1850.00, 10.00, now() - interval '1 hour', now() + interval '12 hours', NULL, NULL),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'STANDARD', 'ACTIVE', 45.00, 55.00, 5.00, now() - interval '2 hours', now() + interval '7 minutes', NULL, NULL),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'STANDARD', 'ACTIVE', 320.00, 320.00, 10.00, now() - interval '3 hours', now() + interval '6 hours', NULL, NULL),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'STANDARD', 'ACTIVE', 2100.00, 2150.00, 25.00, now() - interval '5 hours', now() + interval '2 hours', NULL, NULL),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'STANDARD', 'ACTIVE', 500.00, 500.00, 10.00, now() - interval '30 minutes', now() + interval '24 hours', NULL, NULL),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'PREMIUM',  'ACTIVE', 450000.00, 465000.00, 5000.00, now() - interval '1 day', now() + interval '3 days', '50000000-0000-0000-0000-000000000001', now() + interval '18 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notarial_closures (id, auction_id, notary_name, deadline, status)
VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006',
        'Notaría Miraflores', now() + interval '18 days', 'PENDING')
ON CONFLICT (auction_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Pujas demo (Juan Comprador)
-- -----------------------------------------------------------------------------
INSERT INTO bids (id, auction_id, bidder_id, amount)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1850.00),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 55.00),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 2150.00),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 465000.00)
ON CONFLICT (id) DO NOTHING;

UPDATE auctions SET top_bid_id = '40000000-0000-0000-0000-000000000001' WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE auctions SET top_bid_id = '40000000-0000-0000-0000-000000000002' WHERE id = '30000000-0000-0000-0000-000000000002';
UPDATE auctions SET top_bid_id = '40000000-0000-0000-0000-000000000003' WHERE id = '30000000-0000-0000-0000-000000000004';
UPDATE auctions SET top_bid_id = '40000000-0000-0000-0000-000000000004' WHERE id = '30000000-0000-0000-0000-000000000006';

-- -----------------------------------------------------------------------------
-- Tarjeta demo tokenizada (para probar la garantía de puja PREMIUM)
-- -----------------------------------------------------------------------------
INSERT INTO payment_methods (id, user_id, provider, provider_token, card_brand, masked_number, cardholder_name, is_default)
VALUES ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'MOCK', 'tok_visa_demo', 'VISA', '4242', 'Juan Comprador', TRUE)
ON CONFLICT (provider, provider_token) DO NOTHING;

COMMIT;
