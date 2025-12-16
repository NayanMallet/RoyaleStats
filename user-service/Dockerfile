FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY user-service ./user-service

# Install dependencies for workspace
RUN pnpm install --frozen-lockfile

# Set DATABASE_URL for Prisma Client generation
ENV DATABASE_URL="file:./prisma/data/database.sqlite"

# Generate Prisma Client
RUN cd user-service && pnpm exec prisma generate

# Build the project
RUN pnpm -r run build

# Deploy the production application to a temporary directory
# This installs production dependencies in an isolated folder
RUN pnpm --filter=user-service --prod deploy /prod/user-service --legacy

FROM base AS production
WORKDIR /app/user-service

# Copy the deployed application
COPY --from=builder /prod/user-service ./

# Copy built code artifacts (in case pnpm deploy excluded them due to .gitignore)
COPY --from=builder /app/user-service/dist ./dist
# Ensure shared workspace package has its code if it was symlinked/packaged without dist
COPY --from=builder /app/shared/dist ./node_modules/shared/dist
# Copy Prisma schema and migrations for runtime migration deployment
COPY --from=builder /app/user-service/prisma ./prisma

EXPOSE 3002
CMD ["npm", "start"]
