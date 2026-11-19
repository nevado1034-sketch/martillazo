-- PulgasYa: taxonomía dinámica (subcategoría + atributos) y normalización
-- de categorías/estados existentes. Idempotente.

BEGIN;

ALTER TABLE pulgasya_listings
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE pulgasya_listings
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_cat_sub
  ON pulgasya_listings (category, subcategory);

CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_condition
  ON pulgasya_listings (condition);

CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_price
  ON pulgasya_listings (price);

CREATE INDEX IF NOT EXISTS idx_pulgasya_listings_attributes
  ON pulgasya_listings USING GIN (attributes);

-- Categorías antiguas -> slugs nuevos del menú principal.
UPDATE pulgasya_listings
SET category = CASE category
  WHEN 'tech' THEN 'tecnologia'
  WHEN 'hogar' THEN 'hogar-jardin'
  WHEN 'infantil' THEN 'bebe-ninos'
  WHEN 'autos' THEN 'autos-motos'
  ELSE category
END
WHERE category IN ('tech', 'hogar', 'infantil', 'autos');

-- Estado libre -> 5 niveles canónicos.
UPDATE pulgasya_listings
SET condition = CASE lower(trim(condition))
  WHEN 'nuevo' THEN 'nuevo'
  WHEN 'con etiqueta' THEN 'nuevo'
  WHEN 'como nuevo' THEN 'como-nuevo'
  WHEN 'como-nuevo' THEN 'como-nuevo'
  WHEN 'sin uso visible' THEN 'como-nuevo'
  WHEN 'bueno' THEN 'bueno'
  WHEN 'buen estado' THEN 'bueno'
  WHEN 'con detalles' THEN 'bueno'
  WHEN 'aceptable' THEN 'lo-ha-dado-todo'
  WHEN 'regular' THEN 'lo-ha-dado-todo'
  WHEN 'lo ha dado todo' THEN 'lo-ha-dado-todo'
  WHEN 'lo-ha-dado-todo' THEN 'lo-ha-dado-todo'
  WHEN 'desgaste visible' THEN 'lo-ha-dado-todo'
  WHEN 'no funciona' THEN 'no-funciona'
  WHEN 'no-funciona' THEN 'no-funciona'
  WHEN 'para reparar' THEN 'no-funciona'
  ELSE lower(trim(condition))
END
WHERE condition IS NOT NULL;

-- Relleno de subcategoría para anuncios antiguos sin dato.
UPDATE pulgasya_listings
SET subcategory = 'varios'
WHERE type = 'producto'
  AND category = 'otros'
  AND subcategory IS NULL;

COMMIT;
