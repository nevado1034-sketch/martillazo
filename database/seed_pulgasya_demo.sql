-- PulgasYa demo seed (SOLO desarrollo / staging local)
-- NO aplicar en producción (SEED_DEMO=false o NODE_ENV=production).
-- Uso: psql "$DATABASE_URL" -f database/seed_pulgasya_demo.sql
--
-- Cuenta: demo@pulgasya.com / pulgasya123
BEGIN;

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
