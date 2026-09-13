# Frontend Dockerfile for CaféOS — builds the Vite SPA, then serves the static
# output through Nginx. Nginx also reverse-proxies /api/v1 and /socket.io to the
# backend container, so the frontend's relative `/api/v1` fetch calls (see
# src/services/api.ts) keep working same-origin — no CORS config needed.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
