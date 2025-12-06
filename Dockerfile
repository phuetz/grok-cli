# Grok CLI - Official Docker Image
# Multi-stage build for optimized production image

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    git \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash grok

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create directories for grok config
RUN mkdir -p /home/grok/.grok && chown -R grok:grok /home/grok

# Set environment
ENV NODE_ENV=production
ENV HOME=/home/grok

# Switch to non-root user
USER grok

# Set working directory for projects
WORKDIR /workspace

# Entry point
ENTRYPOINT ["node", "/app/dist/index.js"]

# Default command (show help)
CMD ["--help"]

# ============================================================================
# Stage 3: Development (optional)
# ============================================================================
FROM node:20-bookworm AS development

WORKDIR /app

# Install dev dependencies
RUN apt-get update && apt-get install -y \
    git \
    ripgrep \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Expose for potential dev server
EXPOSE 3000

# Dev entry point
CMD ["npm", "run", "dev:node"]
