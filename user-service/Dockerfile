FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY user-service ./user-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Set DATABASE_URL for Prisma Client generation
ENV DATABASE_URL="file:./prisma/data/database.sqlite"

# Generate Prisma Client
RUN cd user-service && pnpm exec prisma generate

# Build the project
RUN pnpm -r run build

# Deploy production dependencies
RUN pnpm --filter=user-service --prod deploy /prod/user-service --legacy

FROM base AS production
WORKDIR /app/user-service

# Copy the deployed application
COPY --from=builder /prod/user-service ./
# Copy built code
COPY --from=builder /app/user-service/dist ./dist
# Copy shared package  
COPY --from=builder /app/shared/dist ./node_modules/shared/dist
# Copy Prisma files
COPY --from=builder /app/user-service/prisma ./prisma

EXPOSE 3002
CMD ["npm", "start"]
