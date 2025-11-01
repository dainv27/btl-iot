FROM node:18-alpine AS base

WORKDIR /app

RUN addgroup -S nodejs && adduser -S mqtt -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY docker/start.sh ./start.sh

RUN apk add --no-cache dos2unix && \
    dos2unix /app/start.sh && \
    chmod +x /app/start.sh && \
    mkdir -p /app/logs && \
    chown -R mqtt:nodejs /app

USER mqtt

EXPOSE 1883 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const net=require('net');const c=net.createConnection(1883,'202corp.com');c.on('connect',()=>{c.end();process.exit(0)});c.on('error',()=>process.exit(1));"

ENV NODE_ENV=production \
    MQTT_PORT=1883 \
    WS_PORT=9090 \
    WEB_PORT=3001

CMD ["sh", "-c", "/app/start.sh"]
