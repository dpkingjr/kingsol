# Kingsol Solitaire production image (used by the `app` and `migrate` services in docker-compose.yml).
#
#   docker compose up -d --build
#
# Stages:
#   deps    install dependencies (cached until package*.json change)
#   build   compile the app; also used by the one-shot `migrate` service, which needs tsx + scripts
#   runner  minimal runtime: Next.js standalone server, no dev dependencies, runs as non-root

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sub-path such as /kingsol when served behind a reverse proxy; inlined into the bundles at build time.
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
