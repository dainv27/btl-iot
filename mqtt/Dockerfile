# Multi-stage Dockerfile for MQTT Broker + Web Dashboard
FROM node:18-alpine AS base

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mqtt -u 1001

# Copy package files
COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY src/ ./src/
COPY docker/start.sh /app/start.sh

# ✅ Make startup script executable BEFORE switching user
RUN chmod +x /app/start.sh

# Create logs directory and set ownership
RUN mkdir -p /app/logs && chown mqtt:nodejs /app/logs

# Switch to non-root user
USER mqtt

EXPOSE 1883 9090 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const net = require('net'); const client = net.createConnection(1883, '14.224.166.195'); client.on('connect', () => { client.end(); process.exit(0); }); client.on('error', () => process.exit(1));"

ENV NODE_ENV=production
ENV MQTT_PORT=1883
ENV WS_PORT=9090
ENV WEB_PORT=3000

CMD ["/app/start.sh"]
