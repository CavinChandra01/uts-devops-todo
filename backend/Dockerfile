# syntax=docker/dockerfile:1
# Dockerfile backend (Express + MySQL), dikembangkan dari docker/awesome-compose react-express-mysql.
# Multi-stage: deps (dependensi produksi) -> test (opsional, untuk CI) -> production (image akhir).

# ---------- Tahap 1: dependensi produksi saja ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Tahap 2: unit test (docker build --target test .) ----------
FROM node:22-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test

# ---------- Tahap 3: image produksi (default) ----------
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json healthcheck.js ./
COPY src ./src
COPY migrations ./migrations

# Versi aplikasi (diisi commit SHA oleh pipeline CI/CD) dan port
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION \
    PORT=3000
EXPOSE 3000

# Jalankan sebagai user non-root bawaan image node (lebih aman)
USER node

# Docker menandai container "healthy" jika /healthz merespons 200
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD ["node", "src/index.js"]
