# PulgasYa

Marketplace peruano de **segunda mano + servicios**. Compra, vende y contrata cerca de ti — precios en **soles (S/)**, tarifas de servicio reales y la opción de **proponer precio**.

## MVP (web)

| Ruta | Qué hace |
|------|----------|
| `/` | Home brand-first: hero híbrido, CTA Buscar + Publicar, pilares Productos \| Servicios |
| `/buscar` | Exploración / búsqueda con filtro de tipo y categorías |
| `/anuncio/:id` | Ficha (plantilla producto ≠ servicio) + **Proponer precio** |
| `/publicar` | Flujo corto: elige Producto o Servicio → campos mínimos |

Datos de demo en cliente + anuncios/ofertas propios en `localStorage`. Backend de subastas del monorepo queda para fases posteriores (auth, chat, pagos/escrow).

## Stack

- **Web:** React 18 + Vite + Tailwind + React Router
- **Estado MVP:** Context + localStorage (`pulgasya:*`)
- **Backend (futuro):** carpeta `backend/` (Express) — no requerido para el MVP web

## Cómo ejecutar

Requisitos: **Node.js ≥ 18.17**

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`

```bash
npm run build    # build de producción (web)
npm run dev:all  # web + backend legacy (opcional)
```

## Estructura web

```
web/src/
├── api/           # stubs listos para API real
├── components/
│   ├── layout/    # header, footer, cookies ES
│   ├── listings/  # cards, toggle, offer modal
│   └── ui/
├── data/          # mock listings
├── pages/         # Home, Browse, Detail, Publish
├── store/         # MarketplaceContext
└── utils/
```

## Diferenciadores vs clasificados genéricos

- **Productos | Servicios** al mismo nivel (nav, home, publicar)
- Servicios con S/h, desde o fijo — no precio de sofá a S/ 0
- **Proponer precio** en ficha (ofertas en estado local)
- Explorar sin login; cookie banner simple en español
