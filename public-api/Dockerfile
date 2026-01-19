FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY public-api ./public-api

# Install ALL dependencies
RUN pnpm install --shamefully-hoist

# Build shared package
RUN pnpm --filter shared build

# Build public-api
RUN pnpm --filter public-api build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/public-api/dist ./public-api/dist
COPY --from=builder /app/public-api/package.json ./public-api/package.json

WORKDIR /app/public-api

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
