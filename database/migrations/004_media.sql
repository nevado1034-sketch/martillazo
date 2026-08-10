-- =============================================================================
-- MARTILLAZO — Fotos y video del producto
-- Migration 004 (aplicar después de 003_wallet.sql)
--
-- Las fotos se guardan como arreglo JSON en products.photos (ya existente).
-- Este cambio agrega un video corto (opcional) al producto, capturado desde
-- el celular del vendedor al "dar el martillazo".
-- =============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN products.video_url IS
  'URL pública del video corto del producto (opcional, capturado en el alta)';
