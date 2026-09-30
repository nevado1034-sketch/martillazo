# PulgasYa API — imagen opcional para Render (Docker) u otro PaaS.
# Preferido soft launch: render.yaml (runtime Node nativo).
#
# Build (desde la raíz del monorepo):
#   docker build -f backend/Dockerfile -t pulgasya-api .
#
# Uploads en /app/backend/uploads/media — montar volumen si quieres persistencia.

FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY web/package.json ./web/

RUN npm ci --omit=dev --workspace=@martillazo/backend

COPY backend ./backend

RUN mkdir -p backend/uploads/media

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "--workspace=@martillazo/backend", "run", "start"]
