# Frontend Dockerfile for CaféOS — builds the Vite SPA, then serves the static
# output through Nginx. Nginx also reverse-proxies /api/v1 and /socket.io to the
# backend container, so the frontend's relative `/api/v1` fetch calls (see
# src/services/api.ts) keep working same-origin — no CORS config needed.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# .dockerignore deliberately excludes .env from this build context, so these two MSG91
# widget values (see src/services/msg91Widget.ts) have to come in as build args instead —
# passed from docker-compose.yml's frontend.build.args, sourced from the repo-root .env.
ARG VITE_MSG91_WIDGET_ID
ARG VITE_MSG91_WIDGET_TOKEN
ENV VITE_MSG91_WIDGET_ID=$VITE_MSG91_WIDGET_ID
ENV VITE_MSG91_WIDGET_TOKEN=$VITE_MSG91_WIDGET_TOKEN

RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
