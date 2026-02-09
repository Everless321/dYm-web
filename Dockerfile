FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# -- Dependencies --
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile || pnpm install

# -- Build frontend --
FROM deps AS build-web
COPY packages/shared packages/shared
COPY packages/web packages/web
RUN pnpm --filter @dym/web build

# -- Build server --
FROM deps AS build-server
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN pnpm --filter @dym/server build

# -- Build native modules (with build tools, then discard) --
FROM base AS build-native
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN pnpm install --filter @dym/server --prod \
    && cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 \
    && npx node-gyp rebuild \
    && chmod +x /app/node_modules/.pnpm/@ffprobe-installer+*/node_modules/@ffprobe-installer/*/ffprobe 2>/dev/null || true \
    && chmod +x /app/node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/*/ffmpeg 2>/dev/null || true

# -- Production (clean, no build tools) --
FROM node:20-slim AS production
WORKDIR /app

# Copy pre-built node_modules from build-native (includes compiled better-sqlite3)
COPY --from=build-native /app/node_modules node_modules
COPY --from=build-native /app/packages/server/node_modules packages/server/node_modules
COPY --from=build-native /app/packages/shared packages/shared
COPY --from=build-native /app/package.json ./

# Copy built artifacts
COPY --from=build-server /app/packages/shared packages/shared
COPY --from=build-server /app/packages/server/dist packages/server/dist
COPY packages/server/package.json packages/server/
COPY --from=build-web /app/packages/web/dist packages/web/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DYM_DATA_DIR=/data

EXPOSE 4000
VOLUME ["/data"]

CMD ["node", "packages/server/dist/server/src/index.js"]
