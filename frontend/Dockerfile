# syntax=docker/dockerfile:1
# Dockerfile frontend (React + Vite) dengan multi-stage build:
# tahap 1 membangun file statis dengan Node, tahap 2 menyajikannya dengan Nginx (image akhir kecil).

# ---------- Tahap 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Versi aplikasi ditanam ke dalam bundle saat build (ditampilkan di footer)
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm test && npm run build

# ---------- Tahap 2: serve dengan Nginx ----------
FROM nginx:1.28-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health || exit 1
