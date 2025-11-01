FROM node:18-alpine AS base

WORKDIR /app

RUN addgroup -S nodejs && adduser -S mqtt -G nodejs

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy broker source files
COPY broker.js ./
COPY config.js ./
COPY config.production.js ./
COPY redis-service.js ./

# Copy docker startup script
COPY docker/start.sh ./start.sh

# Install dos2unix and setup
RUN apk add --no-cache dos2unix && \
    dos2unix /app/start.sh && \
    chmod +x /app/start.sh && \
    mkdir -p /app/logs && \
    chown -R mqtt:nodejs /app

USER mqtt

# Expose ports: MQTT, WebSocket, Web Dashboard
EXPOSE 1883 9090 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const net=require('net');const c=net.createConnection(1883,'202corp.com');c.on('connect',()=>{c.end();process.exit(0)});c.on('error',()=>process.exit(1));"

ENV NODE_ENV=production \
    MQTT_PORT=1883 \
    WS_PORT=9090 \
    WEB_PORT=3001 \
    REDIS_URL=redis://redis:6379

CMD ["sh", "-c", "/app/start.sh"]
