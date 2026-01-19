### Build stage (uses pnpm workspace)
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfiles and package manifests so pnpm can install deterministically
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY front/package.json ./front/package.json

# Install workspace dependencies according to lockfile
RUN pnpm install --frozen-lockfile

# Copy the full project and build the front app
COPY . .
WORKDIR /app/front
RUN pnpm install && pnpm run build

### Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/front/dist /usr/share/nginx/html
# Copy custom nginx config
COPY front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
