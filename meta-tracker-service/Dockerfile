FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Toolchain for better-sqlite3, used only when no prebuilt binary matches the platform
RUN apk add --no-cache python3 make g++

# Workspace manifests and lockfile: the image gets the exact versions of pnpm-lock.yaml.
# pnpm-workspace.yaml allows better-sqlite3 to build its native binding (onlyBuiltDependencies).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY meta-tracker-service ./meta-tracker-service

# Only this service and the packages it depends on (shared)
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter meta-tracker-service...

# Build shared package
RUN pnpm --filter shared build

# Build meta-tracker-service
RUN pnpm --filter meta-tracker-service build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/meta-tracker-service/dist ./meta-tracker-service/dist
COPY --from=builder /app/meta-tracker-service/package.json ./meta-tracker-service/package.json

WORKDIR /app/meta-tracker-service

ENV NODE_ENV=production
EXPOSE 3006

CMD ["node", "dist/server.js"]
