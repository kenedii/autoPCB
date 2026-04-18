# Dockerfile for Next.js Application

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm install

# Verify next CLI is available
RUN ./node_modules/.bin/next --version

# Copy source code
COPY . .

# Build with explicit path to next
RUN ./node_modules/.bin/next build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install openssl for Prisma support, python3 for compile execution, and skidl for circuit compilation
RUN apt-get update -y && \
    apt-get install -y openssl python3 python3-pip && \
    pip3 install --break-system-packages --no-cache-dir skidl && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /home/nextjs nextjs

# Pre-create emails directory
RUN mkdir -p /app/public/emails

# Set ownership
RUN chown -R nextjs:nodejs /app
RUN chown -R nextjs:nodejs /home/nextjs

USER nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/utils/emailtemplates ./src/utils/emailtemplates

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
