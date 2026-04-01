# Dockerfile for Next.js Application

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma and Python/SKiDL dependencies for compilation
RUN apt-get update && apt-get install -y openssl python3 python3-pip python3-venv kicad kicad-symbols kicad-footprints && rm -rf /var/lib/apt/lists/*

# Setup Python virtual environment for SKiDL
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install skidl

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
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL for Prisma and Python/SKiDL dependencies
RUN apt-get update && apt-get install -y openssl python3 python3-pip python3-venv kicad kicad-symbols kicad-footprints && rm -rf /var/lib/apt/lists/*

# Setup Python virtual environment for SKiDL
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install skidl

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /home/nextjs nextjs

# Setup KiCad footprint library table for SKiDL to avoid missing footprint warnings
RUN mkdir -p /home/nextjs/.config/kicad/6.0 /home/nextjs/.config/kicad/7.0 /home/nextjs/.config/kicad/8.0
RUN cp /usr/share/kicad/template/fp-lib-table /home/nextjs/.config/kicad/6.0/ || true
RUN cp /usr/share/kicad/template/fp-lib-table /home/nextjs/.config/kicad/7.0/ || true
RUN cp /usr/share/kicad/template/fp-lib-table /home/nextjs/.config/kicad/8.0/ || true
RUN cp /usr/share/kicad/template/sym-lib-table /home/nextjs/.config/kicad/6.0/ || true
RUN cp /usr/share/kicad/template/sym-lib-table /home/nextjs/.config/kicad/7.0/ || true
RUN cp /usr/share/kicad/template/sym-lib-table /home/nextjs/.config/kicad/8.0/ || true
RUN chown -R nextjs:nodejs /home/nextjs/.config

# Setup Env Variables for Kicad
ENV KICAD_SYMBOL_DIR=/usr/share/kicad/symbols
ENV KICAD6_SYMBOL_DIR=/usr/share/kicad/symbols
ENV KICAD7_SYMBOL_DIR=/usr/share/kicad/symbols
ENV KICAD8_SYMBOL_DIR=/usr/share/kicad/symbols
ENV KICAD9_SYMBOL_DIR=/usr/share/kicad/symbols
ENV KICAD_FOOTPRINT_DIR=/usr/share/kicad/footprints
ENV KICAD6_FOOTPRINT_DIR=/usr/share/kicad/footprints
ENV KICAD7_FOOTPRINT_DIR=/usr/share/kicad/footprints
ENV KICAD8_FOOTPRINT_DIR=/usr/share/kicad/footprints
ENV KICAD9_FOOTPRINT_DIR=/usr/share/kicad/footprints

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
