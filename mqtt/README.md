# 🚀 MQTT IoT Platform

A complete MQTT broker solution with web dashboard for IoT device monitoring and management.

## 📁 Project Structure

```
mqtt/
├── src/
│   ├── broker/           # MQTT Broker core
│   │   ├── broker.js     # Main broker implementation
│   │   ├── config.js     # Development configuration
│   │   └── config.production.js  # Production configuration
│   ├── web/              # Web Dashboard
│   │   ├── web-server.js # Express web server
│   │   └── public/       # Static web files
│   │       ├── index.html
│   │       ├── style.css
│   │       └── dashboard.js
│   └── clients/          # MQTT Client examples
│       ├── iot-device-client.js
│       ├── device-manager.js
│       └── test-client.js
├── docker/               # Docker configuration
│   └── start.sh         # Multi-service startup script
├── docker-compose.yml   # Development setup
├── docker-compose.prod.yml  # Production setup
├── Dockerfile           # Multi-stage container build
└── env.example          # Environment variables template
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

#### Development Setup
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Production Setup
```bash
# Copy environment file
cp env.example .env

# Edit environment variables
nano .env

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start MQTT broker
npm start

# Start web dashboard (in new terminal)
npm run dashboard

# Test with IoT device (in new terminal)
npm run test:iot
```

## 🌐 Access Points

- **Web Dashboard**: http://14.224.166.195:3000
- **MQTT Broker**: mqtt://14.224.166.195:1883
- **WebSocket**: ws://14.224.166.195:8080
- **MQTT Explorer**: http://14.224.166.195:4000 (with tools profile)

## 📱 IoT Device Topics

### Device Management Topics
- `iot/device/register` - Device registration
- `iot/device/status` - Device status updates
- `iot/device/data` - General device data
- `iot/device/heartbeat` - Device health monitoring
- `iot/device/command` - Commands to devices
- `iot/device/response` - Device responses

### Sensor Data Topics (Device-Specific)
- `iot/sensor/data/{deviceId}` - Sensor data from specific device
- `iot/sensor/data/{deviceId}/response` - Sensor control responses

### Sensor Control Topics (Device-Specific)
- `iot/sensor/ctl/{deviceId}` - Control commands for specific device

### Example Topic Usage
```
# Device sends sensor data
iot/sensor/data/iot-device-12345

# Control system sends commands to device
iot/sensor/ctl/iot-device-12345

# Device responds to control commands
iot/sensor/data/iot-device-12345/response
```

## 🎯 Features

### MQTT Broker
- ✅ Standard MQTT protocol support
- ✅ MQTT over WebSocket support
- ✅ Configurable authentication
- ✅ Real-time connection monitoring
- ✅ IoT device detection and management
- ✅ Enhanced logging with device statistics
- ✅ Graceful shutdown handling

### Web Dashboard
- ✅ Real-time device monitoring
- ✅ Live sensor data visualization
- ✅ Alert system with threshold monitoring
- ✅ Device registry and health tracking
- ✅ Data export functionality
- ✅ Responsive modern UI
- ✅ WebSocket-based real-time updates

### Docker Integration
- ✅ Multi-service container setup
- ✅ Production-ready configuration
- ✅ Health checks and monitoring
- ✅ Volume persistence for logs
- ✅ Environment-based configuration
- ✅ Resource limits and scaling

## 🛠️ Available Scripts

### Development
- `npm start` - Start MQTT broker
- `npm run dev` - Start broker with auto-restart
- `npm run dashboard` - Start web dashboard
- `npm run test` - Run basic MQTT test client
- `npm run test:iot` - Run IoT device simulation
- `npm run test:sensor-control` - Test sensor control commands
- `npm run comprehensive-test` - Run full IoT device + control system test
- `npm run manager` - Run device manager

### Docker
- `npm run build` - Build Docker images
- `npm run up` - Start services with Docker Compose
- `npm run down` - Stop services
- `npm run logs` - View service logs

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_PORT` | 1883 | MQTT broker port |
| `WS_PORT` | 8080 | WebSocket port |
| `WEB_PORT` | 3000 | Web dashboard port |
| `REQUIRE_AUTH` | false | Enable authentication |
| `MQTT_USERNAME` | admin | MQTT username |
| `MQTT_PASSWORD` | password123 | MQTT password |
| `MAX_CONNECTIONS` | 1000 | Maximum connections |
| `LOG_LEVEL` | info | Logging level |

### Production Configuration

For production deployment:

1. Copy `env.example` to `.env`
2. Set secure passwords and configuration
3. Use `docker-compose.prod.yml` for production setup
4. Enable authentication and rate limiting
5. Configure SSL/TLS certificates if needed

## 📊 Monitoring & Alerts

The platform includes comprehensive monitoring:

- **Device Health**: Uptime, memory usage, connection status
- **Sensor Alerts**: Temperature > 30°C, Humidity > 80%
- **Connection Monitoring**: Real-time device tracking
- **Data Logging**: Complete message history with timestamps
- **Performance Metrics**: Message counts, connection statistics

## 🔒 Security Features

- **Authentication**: Username/password authentication
- **Rate Limiting**: Configurable message rate limits
- **Connection Limits**: Maximum concurrent connections
- **Non-root Container**: Security-hardened Docker containers
- **Environment Isolation**: Separate dev/prod configurations

## 🚀 Deployment

### Docker Swarm
```bash
# Deploy to Docker Swarm
docker stack deploy -c docker-compose.prod.yml mqtt-platform
```

### Kubernetes
```bash
# Convert to Kubernetes manifests
kompose convert -f docker-compose.prod.yml
```

### Cloud Deployment
- **AWS**: Use ECS or EKS with load balancers
- **Azure**: Use Container Instances or AKS
- **Google Cloud**: Use Cloud Run or GKE

## 🧪 Testing

### Manual Testing
```bash
# Start the platform
docker-compose up -d

# Test MQTT connection
npm run test

# Test IoT device
npm run test:iot

# Test device manager
npm run manager
```

### Automated Testing
```bash
# Run health checks
docker-compose exec mqtt-platform node -e "console.log('Health check passed')"
```

## 📈 Scaling

### Horizontal Scaling
- Multiple broker instances with load balancing
- Redis for shared state and message persistence
- Nginx for reverse proxy and SSL termination

### Vertical Scaling
- Increase container resources in docker-compose
- Configure connection limits and rate limiting
- Monitor memory and CPU usage

## 🔧 Troubleshooting

### Common Issues

1. **Port Conflicts**: Change ports in environment variables
2. **Connection Refused**: Ensure broker is running and ports are open
3. **Authentication Failed**: Check username/password configuration
4. **Docker Issues**: Check container logs with `docker-compose logs`

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose up
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ for IoT developers**