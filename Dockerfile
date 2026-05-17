FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/server/package.json packages/server/
COPY packages/worker/package.json packages/worker/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/db/ packages/db/
COPY packages/server/ packages/server/
COPY packages/worker/ packages/worker/
COPY apps/web/ apps/web/
RUN pnpm -r build

# Runtime
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=deps /app/packages/worker/node_modules ./packages/worker/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/src/migrations ./packages/db/src/migrations
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/worker/dist ./packages/worker/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/server/package.json packages/server/
COPY packages/worker/package.json packages/worker/
COPY apps/web/package.json apps/web/
COPY agent-board.yaml ./

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
