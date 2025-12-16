FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native modules if needed
RUN apk add --no-cache python3 build-base linux-headers

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/package.json
COPY api-gateway/package.json ./api-gateway/package.json

RUN corepack enable \
  && pnpm -r --filter ./api-gateway... install --frozen-lockfile

COPY shared ./shared
COPY api-gateway ./api-gateway
RUN pnpm -r --filter ./api-gateway... run build

FROM node:20-alpine AS production
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY api-gateway/package.json ./api-gateway/package.json
COPY shared/package.json ./shared/package.json

# Install production dependencies only
RUN corepack enable \
  && pnpm -r --filter ./api-gateway... install --prod --frozen-lockfile

COPY --from=builder /app/api-gateway/dist ./api-gateway/dist
COPY --from=builder /app/shared/dist ./shared/dist

WORKDIR /app/api-gateway
EXPOSE 3000
CMD ["node", "dist/server.js"]