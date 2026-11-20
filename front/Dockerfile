### Build stage (uses pnpm workspace)
FROM node:22-alpine AS builder
WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Copy lockfiles and package manifests so pnpm can install deterministically
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY front/package.json ./front/package.json

# Install the front dependencies, exactly as locked (this layer is cached until a manifest changes)
RUN pnpm install --frozen-lockfile --filter front...

# Copy the full project and build the front app. No second install: it could resolve other
# versions than the lockfile.
COPY . .
WORKDIR /app/front
RUN pnpm run build

### Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/front/dist /usr/share/nginx/html
# Copy custom nginx config
COPY front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
