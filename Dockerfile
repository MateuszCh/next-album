# syntax=docker/dockerfile:1

# Multi-stage build. `dev` is used by docker-compose for local development
# (hot reload, source bind-mounted); `prod` is a lean standalone runtime image
# that connects to an external MongoDB via MONGODB_URI.

FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install node_modules from the lockfile ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- dev: local development target (compose mounts the source over /app) ---
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

# --- build: produce the standalone production bundle ---
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- prod: minimal runtime image ---
FROM node:24-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# next.config.ts `output: 'standalone'` emits server.js + a trimmed node_modules.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
