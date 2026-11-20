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
COPY user-service ./user-service

# Only this service and the packages it depends on (shared)
RUN pnpm install --frozen-lockfile --shamefully-hoist --filter user-service...

# Build shared package
RUN pnpm --filter shared build

# Build user-service
RUN pnpm --filter user-service build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder (including compiled node_modules)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/user-service/dist ./user-service/dist
COPY --from=builder /app/user-service/package.json ./user-service/package.json

WORKDIR /app/user-service

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "dist/server.js"]
