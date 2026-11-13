# Deploy (soft launch) — Vercel + Render + Neon

Guía click-by-click en español (Agent Store): `docs/pulgasya-deploy-guide.md`.

## Archivos de este repo

| Archivo | Uso |
|---------|-----|
| `web/vercel.json` | SPA rewrites + build Vite |
| `render.yaml` | Blueprint Render (API Node) |
| `backend/Dockerfile` | Alternativa Docker en Render |
| `scripts/migrate.sh` | `schema.sql` + migraciones `002`…`009` |

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
FIREBASE_SERVICE_ACCOUNT_KEY=<JSON string de la service account>
FIREBASE_PROJECT_ID=<projectId de Firebase>
```

No fijes `PORT` (Render lo inyecta).

`CLIENT_ORIGIN` / `ORIGINS` aceptan varios orígenes separados por coma.

## Env — Vercel (Root Directory = `web`)

```
VITE_API_BASE_URL=https://api.pulgasya.com
VITE_FIREBASE_API_KEY=<...>
VITE_FIREBASE_AUTH_DOMAIN=<...>
VITE_FIREBASE_PROJECT_ID=<...>
VITE_FIREBASE_STORAGE_BUCKET=<...>
VITE_FIREBASE_MESSAGING_SENDER_ID=<...>
VITE_FIREBASE_APP_ID=<...>
```

No pongas `VITE_ENABLE_SANDBOX_PAY=true`.

## Uploads (fotos de anuncios)

Las imágenes se normalizan al subirlas: se convierten a **JPEG**, se corrigen según la orientación EXIF, se reducen a máx. **1600 px** y los **HEIC/HEIF de iPhone** se convierten a JPEG para que carguen en cualquier celular.

### Opción recomendada: object storage (R2 / S3 / B2)

Es la única opción que **no pierde fotos** al escalar a varias instancias, permite backups/versionado y sirve por CDN.

1. Crea un bucket en **Cloudflare R2** (o S3/B2) con acceso público o un dominio/CDN.
2. En Render → Environment define:
   ```
   UPLOADS_DRIVER=s3
   S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # AWS: vacío
   S3_REGION=auto                                             # AWS: us-east-1
   S3_BUCKET=pulgasya-media
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_URL=https://media.pulgasya.com                   # o https://pub-xxxx.r2.dev
   S3_PREFIX=uploads
   ```
3. Redeploy. `GET /health` debe responder `"storage":"s3"`.
4. Activa **versionado** en el bucket para que ninguna foto se sobrescriba o borre por accidente.

La base de datos guarda la URL pública absoluta; la web no cambia.

### Opción intermedia: disco persistente en Render

Sirve para lanzar con **una sola instancia**. El disco local es **efímero**; cada redeploy/reinicio borra las fotos ya publicadas. Hay que montar un disco persistente:

1. Render → servicio API → **Disks** → Add Disk.
2. Name: `pulgasya-media` · Mount Path: `/var/data` · Size: `1 GB`.
3. Environment → `UPLOADS_DRIVER=local` y `UPLOADS_DIR=/var/data/uploads`.
4. Redeploy.

El `render.yaml` ya declara el disco y las variables, pero si el servicio se creó a mano hay que aplicarlo en el dashboard. Las fotos subidas antes del disco persistente no se pueden recuperar: hay que volver a subirlas.

### Local (desarrollo)

Sin variables, las fotos se guardan en `backend/uploads/media` y se sirven en `/uploads`.

## DNS (cPanel)

- `pulgasya.com` / `www` → Vercel (A / CNAME)
- `api.pulgasya.com` → Render (CNAME)
- MX/correo sin cambios
