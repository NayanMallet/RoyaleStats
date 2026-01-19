FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY clash-data-service ./clash-data-service

# Install ALL dependencies
RUN pnpm install --shamefully-hoist

# Build shared package
RUN pnpm --filter shared build

# Build clash-data-service
RUN pnpm --filter clash-data-service build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/clash-data-service/dist ./clash-data-service/dist
COPY --from=builder /app/clash-data-service/package.json ./clash-data-service/package.json

WORKDIR /app/clash-data-service

ENV NODE_ENV=production
EXPOSE 3004

CMD ["node", "dist/server.js"]
