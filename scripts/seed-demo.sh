#!/usr/bin/env bash
# Aplica seed demo solo si SEED_DEMO=true y NODE_ENV != production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "Refused: NODE_ENV=production — no seed demo."
  exit 1
fi
if [[ "${SEED_DEMO:-false}" != "true" ]]; then
  echo "Refused: set SEED_DEMO=true to apply database/seed_pulgasya_demo.sql"
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL required"
  exit 1
fi
psql "$DATABASE_URL" -f "$ROOT/database/seed_pulgasya_demo.sql"
echo "Demo seed applied."
