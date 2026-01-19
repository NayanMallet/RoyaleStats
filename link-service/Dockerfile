FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Build stage
FROM base AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY shared ./shared
COPY link-service ./link-service

# Enable build scripts and force fresh install for Linux
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --shamefully-hoist
RUN npm rebuild better-sqlite3

# Build shared package
RUN pnpm --filter shared build

# Build link-service
RUN pnpm --filter link-service build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/link-service/dist ./link-service/dist
COPY --from=builder /app/link-service/package.json ./link-service/package.json

WORKDIR /app/link-service

ENV NODE_ENV=production
EXPOSE 3005

CMD ["node", "dist/server.js"]
