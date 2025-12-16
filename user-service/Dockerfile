FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
# Install build tools for native modules (sqlite3, etc.)
# py3-setuptools provides distutils needed by node-gyp on Python 3.12+
RUN apk add --no-cache python3 py3-setuptools build-base linux-headers

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared ./shared
COPY user-service ./user-service

# Install dependencies for workspace
RUN pnpm install --frozen-lockfile

# Build the project
RUN pnpm -r run build

# Deploy the production application to a temporary directory
# This installs production dependencies (including rebuilding native modules) in an isolated folder
RUN pnpm --filter=user-service --prod deploy /prod/user-service --legacy

FROM base AS production
# Install build tools for rebuilding native modules in production
# py3-setuptools provides distutils needed by node-gyp on Python 3.12+
RUN apk add --no-cache python3 py3-setuptools build-base linux-headers

WORKDIR /app/user-service

# Copy the deployed application (includes node_modules with compiled binaries)
COPY --from=builder /prod/user-service ./

# Copy built code artifacts (in case pnpm deploy excluded them due to .gitignore)
COPY --from=builder /app/user-service/dist ./dist
# Ensure shared workspace package has its code if it was symlinked/packaged without dist
COPY --from=builder /app/shared/dist ./node_modules/shared/dist

# Rebuild native modules in the production environment to ensure correct bindings
# Navigate to the sqlite3 package and rebuild it directly with npm
RUN cd node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3 && npm run install --build-from-source

EXPOSE 3002
CMD ["node", "dist/server.js"]
