# Martillazo — Subastas P2P

Plataforma escalable de subastas *Peer-to-Peer*: desde cachivaches de bajo valor
hasta bienes raíces y vehículos de alto valor. Mobile-First, con eventos en
tiempo real para las pujas en vivo.

## Arquitectura

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  Web / Dashboard    │         │          Backend             │
│  React + Vite       │  REST   │  Node.js (Express)           │
│  Tailwind CSS       ├────────►│  REST API  :4000             │
│                     │         │                              │
│  Móvil (Expo) [fut.]│  Socket │  Socket.IO  :4000 (tiempo real)
└─────────────────────┘◄────────┤  ├─ módulo bids (pujas)      │
                                │  └─ módulo auctions          │
                                └──────┬───────────────┬───────┘
                                       │               │
                          ┌────────────▼─────┐   ┌────▼────────────┐
                          │   PostgreSQL     │   │  Redis          │
                          │  Fuente de verdad│   │  Estado caliente│
                          │  (pgcrypto, etc.)│   │  de subastas    │
                          └──────────────────┘   └─────────────────┘
```

| Capa      | Tecnología                          | Responsabilidad                                   |
|-----------|-------------------------------------|---------------------------------------------------|
| Web/Home  | React 18 + Vite + Tailwind CSS     | UI Mobile-First, cuenta regresiva, pujas en vivo  |
| Móvil     | React Native / Expo *(roadmap)*    | Misma API y WebSockets que la Web                 |
| Backend   | Node.js + Express + Socket.IO      | REST, autenticación JWT, eventos en tiempo real   |
| Datos     | PostgreSQL 15+                     | Transacciones, usuarios, auditoría legal          |
| Cache     | Redis                              | Precio vigente y cuenta regresiva de baja latencia|

## Lógica de negocio diferenciada

| Flujo      | Segmento        | Requisitos                                                       | Cierre                  |
|------------|-----------------|------------------------------------------------------------------|-------------------------|
| STANDARD   | Cachivaches     | Registro básico + escrow                                          | Entrega física confirmada por ambas partes → liberación del escrow |
| PREMIUM    | Inmuebles/Autos | KYC estricto (DNI/CE + biometría) · validación de Partida Registral Sunarp · retención de garantía en tarjeta de crédito para pujar | Firma notarial offline dentro de plazo fijo (`notary_closure_deadline`) |

## Estructura del repositorio

```
martillazo/
├── database/
│   ├── schema.sql                  # Schema PostgreSQL completo + seed de categorías
│   └── migrations/
│       └── 002_payments_escrow.sql # Motor de pagos: transacciones, comisiones, tarjetas
├── backend/
│   └── src/
│       ├── config/env.js           # Configuración desde variables de entorno
│       ├── db/pool.js              # Pool de conexiones pg
│       ├── redis/cache.js          # Caché Redis con degradación a memoria
│       ├── middleware/             # auth (JWT) y manejador de errores
│       ├── modules/
│       │   ├── bids/               # Servicio/controller/rutas de pujas
│       │   ├── auctions/           # Listado de subastas activas (Home)
│       │   └── payments/           # Motor financiero: pagos, comisiones, garantía, proveedores
│       │       ├── providers/      # Mock (dev) · Stripe/Culqi/Niubiz (producción)
│       │       ├── payments.service.js    # Escrow estándar (HOLD_ESCROW → COMPLETED)
│       │       ├── guarantees.service.js  # Pre-autorización de tarjeta + penalidad
│       │       ├── commissions.service.js # 8% estándar · $50+1.5% (tope $3k) premium
│       │       └── escrow.js       # Cuentas puente y débitos con saldo suficiente
│       ├── sockets/                # Socket.IO: bid:join, bid:place, bid:leave
│       ├── utils/                  # money.js (céntimos) · errors.js
│       ├── app.js                  # Composición de Express
│       └── index.js                # Bootstrap (HTTP + WebSocket en el mismo puerto)
└── web/
    └── src/
        ├── api/                    # fetch + cliente Socket.IO
        ├── hooks/useCountdown.js
        ├── components/             # SearchBar, FilterPills, AuctionCard, CountdownTimer, FAB
        └── pages/Home.jsx          # Pantalla principal
```

## Motor de pagos, comisiones y custodia (Escrow)

| Concepto | Flujo STANDARD (Cachivaches) | Flujo PREMIUM (Inmuebles/Autos) |
|----------|------------------------------|--------------------------------|
| Comisión | 8% sobre el valor final, paga el vendedor al completarse la venta | $50 USD fijos por publicar (validación SUNARP) + 1.5% con tope de $3,000 USD |
| Custodia | El ganador paga → `HOLD_ESCROW` → confirmación de entrega en 48h → `COMPLETED` | Pre-autorización de tarjeta como garantía (hold) |
| Disputa  | Fondos congelados hasta que soporte intervenga | — |
| Garantía  | — | Pierde → liberación sin cargos · Firma → abono al pago inicial · No firma en 15 días → cobro de garantía: 50% vendedor / 50% plataforma |

Todos los montos se trabajan en **unidades menores (céntimos)** (`utils/money.js`)
para evitar errores de punto flotante, y cada operación muta la base dentro de
una transacción con `SELECT … FOR UPDATE` (nunca se pierde dinero en operaciones
simultáneas). Los pagos admiten cabecera `Idempotency-Key` para evitar dobles
cobros.

## Cómo ejecutar

Requisitos: **Node.js ≥ 18.17**, **PostgreSQL ≥ 15**, Redis (opcional).

```bash
# 1) Base de datos — crear la BD y aplicar el schema + migraciones
createdb martillazo
psql -d martillazo -f database/schema.sql
psql -d martillazo -f database/migrations/002_payments_escrow.sql

# 2) Variables de entorno
cp backend/.env.example backend/.env
cp web/.env.example web/.env

# 3) Dependencias e instalación
npm install

# 4) Arrancar todo (backend + web)
npm run dev
```

- Backend (API + WebSockets): `http://localhost:4000` · health check en `GET /health`
- Web (Home): `http://localhost:5173`

## API y WebSockets

### REST

| Método | Ruta                              | Descripción                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/auctions`                   | Subastas activas (`?flow=&q=&limit=`)     |
| POST   | `/api/auctions/:auctionId/place`  | Colocar puja (requiere Bearer JWT)        |
| POST   | `/api/payments/standard/process`  | Pago del ganador → `HOLD_ESCROW` (Idempotency-Key) |
| POST   | `/api/payments/escrow/release`    | Libera escrow → comisión 8% + neto al vendedor (`COMPLETED`) |
| POST   | `/api/payments/escrow/dispute`    | Congela la custodia por disputa (`DISPUTED`) |
| POST   | `/api/payments/escrow/refund`     | Reembolso total al comprador (`REFUNDED`) |
| POST   | `/api/guarantees/hold`            | Pre-autorización de tarjeta (PREMIUM, KYC requerido) |
| POST   | `/api/guarantees/:holdId/release` | Liberación sin cargos (perdió la subasta) |
| POST   | `/api/guarantees/:holdId/apply-to-down-payment` | Garantía abonada al pago inicial (firma notarial) |
| POST   | `/api/guarantees/:holdId/charge-penalty` | Penalidad 50/50 (no firmó en 15 días) |
| GET    | `/health`                         | Health check                             |

### WebSocket (Socket.IO)

| Evento         | Dirección   | Payload                          | Respuesta                                   |
|----------------|-------------|----------------------------------|---------------------------------------------|
| `bid:join`     | c→s         | `{ auctionId }`                  | ack con estado de la subasta                |
| `bid:place`    | c→s         | `{ auctionId, amount }`          | ack ok/error; broadcast `bid:new`           |
| `bid:leave`    | c→s         | `{ auctionId }`                  | —                                           |
| `bid:new`      | s→c (sala)  | precio, pujador, mínimo, `endsAt`, `extended` | —                            |
| `auction:extended` | s→c (sala) | `{ auctionId, endsAt }`       | —                                           |

**Validación de una puja (fuente de verdad: PostgreSQL):** la subasta se
bloquea con `SELECT … FOR UPDATE`, se exige estado `ACTIVE`, tiempo restante
> 0, monto ≥ `current_price + min_increment` y que el pujador no sea el
vendedor. Con la puja en la ventana anti-snipe (por defecto 60 s) se extiende
el reloj automáticamente.

## Roadmap

1. Autenticación completa (registro, login, JWT) y módulo de alta en 3 pasos.
2. Proveedores de pago reales (Stripe, Culqi, Niubiz) bajo la interfaz de `providers/`.
3. Worker de cierre de subastas (AWARDED), expiración de garantías y confirmaciones.
4. App móvil en React Native / Expo reutilizando el mismo backend.
