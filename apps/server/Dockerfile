# ==============================================
# PLUGSPACE.IO TITAN v1.4 - VOICE SERVER DOCKERFILE
# ==============================================

FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build the application
FROM base AS builder

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV VOICE_SERVER_PORT=4001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 voiceserver

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Create log directory
RUN mkdir -p /var/log/plugspace && chown -R voiceserver:nodejs /var/log/plugspace

USER voiceserver

EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["node", "dist/index.js"]
