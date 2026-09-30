#!/usr/bin/env bash
# Aplica schema + migraciones 002…009 contra DATABASE_URL (Neon / local / Render shell).
# NO aplica seed demo. Uso:
#   export DATABASE_URL='postgresql://…@….neon.tech/neondb?sslmode=require'
#   bash scripts/migrate.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: define DATABASE_URL (cadena de Neon o Postgres)."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: falta psql (PostgreSQL client)."
  echo "  macOS: brew install libpq && brew link --force libpq"
  echo "  Ubuntu: sudo apt-get install -y postgresql-client"
  exit 1
fi

echo "==> schema.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/database/schema.sql"

for f in "$ROOT"/database/migrations/*.sql; do
  echo "==> $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Migraciones OK. No ejecutes seed_pulgasya_demo.sql en producción."
