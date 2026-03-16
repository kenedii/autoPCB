# Dockerfile for Next.js Application

# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma and Python/SKiDL dependencies for compilation
RUN apt-get update && apt-get install -y openssl python3 python3-pip kicad-cli && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-slim AS runner

WORKDIR /app

# Install OpenSSL for Prisma and Python/SKiDL dependencies
RUN apt-get update && apt-get install -y openssl python3 python3-pip kicad-cli && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /home/nextjs nextjs

# Set ownership
RUN chown -R nextjs:nodejs /app
RUN chown -R nextjs:nodejs /home/nextjs

USER nextjs

ENV HOME=/home/nextjs

# Copy necessary files from builder
# Note: Next.js standalone output must be enabled in next.config.js
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
