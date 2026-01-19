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
COPY user-service ./user-service

# Enable build scripts and force fresh install for Linux
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --shamefully-hoist
RUN npm rebuild better-sqlite3

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
