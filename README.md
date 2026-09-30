# PulgasYa

Marketplace peruano de **segunda mano + servicios**. Compra, vende y contrata cerca de ti — precios en **soles (S/)**, WhatsApp, ofertas y auth real.

## MVP

| Ruta | Qué hace |
|------|----------|
| `/` | Home brand-first + CTAs Buscar / Publicar |
| `/buscar` | Exploración con filtro Productos \| Servicios |
| `/anuncio/:id` | Ficha + WhatsApp + Proponer precio |
| `/publicar` | Flujo corto (auth + foto + campos por tipo) |
| `/mis-ofertas` | Ofertas enviadas por el comprador |

## Stack

- **Web:** React 18 + Vite + Tailwind + React Router → **Vercel**
- **API:** Express (monorepo `backend/`) + JWT + multer → **Render**
- **DB:** PostgreSQL 16 (`pulgasya_listings`, `pulgasya_offers`, `users`) → **Neon**
- **Dominio:** pulgasya.com (DNS/email en cPanel; tráfico web/API a Vercel + Render)

Guía click-by-click (español): Agent Store `docs/pulgasya-deploy-guide.md`.  
Configs en repo: `web/vercel.json`, `render.yaml`, `backend/Dockerfile`.

## Cómo ejecutar

```bash
# PostgreSQL + migraciones (ver docs/pulgasya-mvp-notes.md en el Agent Store)
cp backend/.env.example backend/.env
cp web/.env.example web/.env
npm install
npm run migrate   # requiere DATABASE_URL + psql
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000 (`GET /health`, estáticos en `/uploads`)

Demo (solo local): aplica `database/seed_pulgasya_demo.sql` con `SEED_DEMO=true`.
No uses seed demo en producción (`SEED_DEMO=false`; migración `009` desactiva la cuenta).

## Soft launch

Sin pasarela real. `PAYMENT_PROVIDER=MOCK`. No pongas `VITE_ENABLE_SANDBOX_PAY=true` en Vercel.

## Estructura web

```
web/src/
├── api/           # auth, listings, offers, uploads
├── components/    # layout, listings, auth, ui
├── pages/
├── store/         # AuthContext + MarketplaceContext
└── utils/         # format S/, whatsapp
```
