-- Soft-launch: desactivar cuenta demo si existía de un seed previo.
-- Aplicar en producción tras migraciones (idempotente).
-- Uso: psql "$DATABASE_URL" -f database/migrations/009_disable_demo_user.sql

BEGIN;

UPDATE users
SET is_active = false
WHERE email = 'demo@pulgasya.com';

COMMIT;
