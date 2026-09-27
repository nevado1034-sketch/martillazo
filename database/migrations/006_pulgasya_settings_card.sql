-- PulgasYa: metadatos de tarjeta en perfil (solo last4 / brand / expiry — nunca PAN/CVV)
-- payment_methods ya existe; esta migración documenta el uso MVP y añade card_last4 opcional.

BEGIN;

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS card_last4 CHAR(4);

COMMENT ON COLUMN payment_methods.masked_number IS
  'Solo máscara tipo •••• 1234 — nunca el PAN completo';
COMMENT ON COLUMN payment_methods.card_last4 IS
  'Últimos 4 dígitos de la tarjeta (MVP). No almacenar PAN ni CVV.';
COMMENT ON COLUMN payment_methods.provider_token IS
  'Token de proveedor o placeholder mock — nunca el número de tarjeta.';

COMMIT;
