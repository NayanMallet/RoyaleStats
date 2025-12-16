FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native modules if needed
RUN apk add --no-cache python3 build-base linux-headers

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY public-api/package.json ./public-api/package.json

RUN corepack enable \
  && pnpm -r --filter ./public-api... install --frozen-lockfile

COPY public-api ./public-api
RUN pnpm -r --filter ./public-api... run build

FROM node:20-alpine AS production
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY public-api/package.json ./public-api/package.json

# Install production dependencies only
RUN corepack enable \
  && pnpm -r --filter ./public-api... install --prod --frozen-lockfile

COPY --from=builder /app/public-api/dist ./public-api/dist

WORKDIR /app/public-api
EXPOSE 3001
CMD ["node", "dist/server.js"]