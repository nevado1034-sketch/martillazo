# Deploy (soft launch) — Vercel + Render + Neon

Guía click-by-click en español (Agent Store): `docs/pulgasya-deploy-guide.md`.

## Archivos de este repo

| Archivo | Uso |
|---------|-----|
| `web/vercel.json` | SPA rewrites + build Vite |
| `render.yaml` | Blueprint Render (API Node) |
| `backend/Dockerfile` | Alternativa Docker en Render |
| `scripts/migrate.sh` | `schema.sql` + migraciones `002`…`010` |

## Comandos Render (manual)

- **Root Directory:** _(vacío — raíz monorepo; NO `backend` ni `web`)_
- **Build:** `npm install`
- **Start:** `npm run start` _(equivale a `npm --workspace backend run start` → `node src/index.js`)_
- **Health check:** `/health`
- **Node:** 20.x (`engines` en `package.json`; Blueprint fija `NODE_VERSION=20.18.0`)
- **PORT:** no lo fijes a mano — Render lo inyecta; el API usa `process.env.PORT`

## Env — Neon

- `DATABASE_URL` — URI con `?sslmode=require`

## Env — Render (API)

```
NODE_ENV=production
DATABASE_URL=<neon>
JWT_SECRET=<≥32 chars>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://pulgasya.com,https://www.pulgasya.com
PAYMENT_PROVIDER=MOCK
SEED_DEMO=false
JOB_SECRET=<random>
ESCROW_WEBHOOK_SECRET=<random>
ADMIN_EMAILS=<tu@email>
SUPPORT_EMAIL=soporte@pulgasya.com

# OAuth social (opcional hasta crear apps; botones muestran «Próximamente»)
PUBLIC_API_URL=https://martillazo.onrender.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

No fijes `PORT` (Render lo inyecta).

`CLIENT_ORIGIN` / `ORIGINS` aceptan varios orígenes separados por coma.

Tras OAuth: aplica `database/migrations/010_user_social_accounts.sql` en Neon. Guía: Agent Store `docs/pulgasya-social-login.md`.

## Env — Vercel (Root Directory = `web`)

```
VITE_API_BASE_URL=https://api.pulgasya.com
```

No pongas `VITE_ENABLE_SANDBOX_PAY=true`.

## Uploads

API sirve `/uploads` desde disco (`backend/uploads/media`). En Render el disco es **efímero** salvo persistent disk — soft launch OK; luego object storage.

## DNS (cPanel)

- `pulgasya.com` / `www` → Vercel (A / CNAME)
- `api.pulgasya.com` → Render (CNAME)
- MX/correo sin cambios
