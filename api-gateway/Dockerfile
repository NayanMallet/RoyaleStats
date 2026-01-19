FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY api-gateway ./api-gateway

# Install ALL dependencies
RUN pnpm install --shamefully-hoist

# Build shared package
RUN pnpm --filter shared build

# Build api-gateway
RUN pnpm --filter api-gateway build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/api-gateway/dist ./api-gateway/dist
COPY --from=builder /app/api-gateway/package.json ./api-gateway/package.json

WORKDIR /app/api-gateway

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
