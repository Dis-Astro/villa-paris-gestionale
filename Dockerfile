# =============================================================================
# VILLA PARIS GESTIONALE - DOCKERFILE
# Multi-stage build for Next.js 15 with Prisma and PostgreSQL
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (uses default schema.prisma → PostgreSQL)
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production dependencies only
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 4: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema for db push at startup
COPY --from=builder /app/prisma ./prisma

# Copy ALL production node_modules (includes Prisma CLI, exceljs, and all transitive deps)
COPY --from=prod-deps /app/node_modules ./node_modules
# Overwrite with generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy entrypoint
COPY docker/entrypoint.sh ./entrypoint.sh
COPY scripts/calendar-sync-worker.js ./scripts/calendar-sync-worker.js
RUN chmod +x ./entrypoint.sh

# Create directories for uploads
RUN mkdir -p ./public/uploads ./public/planimetrie && \
    chown -R nextjs:nodejs ./public ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
