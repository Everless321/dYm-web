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

# -- Production --
FROM node:20-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install native build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN pnpm install --filter @dym/server --prod

# Rebuild better-sqlite3 for this container
RUN cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx node-gyp rebuild

# Fix ffprobe/ffmpeg permissions
RUN chmod +x node_modules/.pnpm/@ffprobe-installer+*/node_modules/@ffprobe-installer/*/ffprobe 2>/dev/null || true
RUN chmod +x node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/*/ffmpeg 2>/dev/null || true

# Copy built artifacts
COPY --from=build-server /app/packages/shared packages/shared
COPY --from=build-server /app/packages/server/dist packages/server/dist
COPY --from=build-web /app/packages/web/dist packages/web/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DYM_DATA_DIR=/data

EXPOSE 4000
VOLUME ["/data"]

CMD ["node", "packages/server/dist/server/src/index.js"]
