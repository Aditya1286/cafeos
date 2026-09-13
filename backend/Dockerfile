# Backend Dockerfile for CaféOS
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Config lives entirely in checked-in JSON (see src/config/index.ts, src/config/config.*.json)
# — no .env file is read at all. config.production.json is baked into dist/config/ by the
# build script above. config.development.json is deliberately NOT copied into the image:
# it's gitignored and holds real local-dev credentials.

# Runs as root by default otherwise — drop to the unprivileged user the base
# image already ships with once every file the process needs is in place.
RUN chown -R node:node /app
USER node

EXPOSE 5000

# /health is exempted from rate limiting and needs no auth (see server.ts) —
# safe for Compose/orchestrators to poll for container readiness/liveness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
