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

- **Web:** React 18 + Vite + Tailwind + React Router
- **API:** Express (monorepo `backend/`) + JWT + multer
- **DB:** PostgreSQL (`pulgasya_listings`, `pulgasya_offers`, `users`)

## Cómo ejecutar

```bash
# PostgreSQL + migraciones (ver docs/pulgasya-mvp-notes.md en el Agent Store)
cp backend/.env.example backend/.env
cp web/.env.example web/.env
npm install
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000  

Cuenta demo: `demo@pulgasya.com` / `pulgasya123`

## Estructura web

```
web/src/
├── api/           # auth, listings, offers, uploads
├── components/    # layout, listings, auth, ui
├── pages/
├── store/         # AuthContext + MarketplaceContext
└── utils/         # format S/, whatsapp
```
