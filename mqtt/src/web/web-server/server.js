const express = require('express');
const cors = require('cors');
const path = require('path');
const mqtt = require('mqtt');

// Import Redis service from broker
const RedisService = require('../../broker/redis-service');

const app = express();
const PORT = 3001;

// Initialize Redis service
const redisService = new RedisService();

// Initialize MQTT client
let mqttClient = null;
let mqttConnected = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Redis on startup
let redisConnected = false;

async function initializeRedis() {
  try {
    redisConnected = await redisService.connect();
    if (redisConnected) {
      console.log('✅ Redis connected successfully');
    } else {
      console.log('⚠️  Redis connection failed - using fallback data');
    }
  } catch (error) {
    console.error('❌ Redis initialization error:', error);
    redisConnected = false;
  }
}

// Initialize MQTT client
async function initializeMQTT() {
  try {
    mqttClient = mqtt.connect('mqtt://localhost:1883', {
      clientId: 'web-server-client',
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      console.log('✅ MQTT client connected');
      mqttConnected = true;
    });

    mqttClient.on('error', (error) => {
      console.error('❌ MQTT client error:', error);
      mqttConnected = false;
    });

    mqttClient.on('close', () => {
      console.log('🔌 MQTT client disconnected');
      mqttConnected = false;
    });

    mqttClient.on('reconnect', () => {
      console.log('🔄 MQTT client reconnecting...');
    });

  } catch (error) {
    console.error('❌ MQTT initialization error:', error);
    mqttConnected = false;
  }
}

// Fallback sample data (used when Redis is not available)
const fallbackDevices = [
  {
    deviceId: 'ESP32_001',
    deviceType: 'sensor',
    location: 'Living Room',
    status: 'online',
    firmware: 'v1.2.3',
    capabilities: ['temperature', 'humidity', 'light'],
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
    lastSeen: new Date().toISOString(),
    messageCount: 1250,
    uptime: 86400,
    memory: { heapUsed: 125000, heapTotal: 320000 },
    lastSensorData: {
      timestamp: new Date().toISOString(),
      sensors: {
        temperature: { value: 23.5, unit: '°C' },
        humidity: { value: 65, unit: '%' },
        light: { value: 450, unit: 'lux' }
      }
    }
  }
];

// API Routes
app.get('/api/status', async (req, res) => {
  try {
    const redisHealth = redisConnected ? await redisService.isHealthy() : false;
    
    res.json({
      broker: {
        mqttPort: 1883,
        wsPort: 9090,
        status: 'running'
      },
      server: {
        port: PORT,
        status: 'running',
        uptime: process.uptime()
      },
      redis: {
        connected: redisConnected,
        healthy: redisHealth
      },
      mqtt: {
        connected: mqttConnected,
        clientId: mqttClient ? 'web-server-client' : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    let devices = [];
    
    if (redisConnected) {
      // Get real devices from Redis
      devices = await redisService.getAllDevices();
      
      // Enhance devices with latest sensor data
      for (let device of devices) {
        const sensorData = await redisService.getLatestSensorData(device.deviceId);
        if (sensorData) {
          device.lastSensorData = sensorData;
        }
      }
    } else {
      // Use fallback data
      devices = fallbackDevices;
    }
    
    res.json({
      success: true,
      devices: devices,
      count: devices.length,
      source: redisConnected ? 'redis' : 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load devices',
      devices: fallbackDevices,
      count: fallbackDevices.length,
      source: 'fallback',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    let device = null;
    
    if (redisConnected) {
      device = await redisService.getDevice(deviceId);
      if (device) {
        const sensorData = await redisService.getLatestSensorData(deviceId);
        if (sensorData) {
          device.lastSensorData = sensorData;
        }
      }
    } else {
      device = fallbackDevices.find(d => d.deviceId === deviceId);
    }
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      device: device,
      source: redisConnected ? 'redis' : 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get device',
      timestamp: new Date().toISOString()
    });
  }
});

// Send command to device via MQTT
app.post('/api/devices/:deviceId/command', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { topic, data, qos = 0, retain = false } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!mqttConnected) {
      return res.status(503).json({
        success: false,
        error: 'MQTT broker not connected',
        timestamp: new Date().toISOString()
      });
    }
    
    // Prepare message payload
    let payload;
    if (typeof data === 'object') {
      payload = JSON.stringify(data);
    } else if (typeof data === 'string') {
      try {
        // Try to parse as JSON to validate
        JSON.parse(data);
        payload = data;
      } catch (e) {
        // If not valid JSON, treat as plain text
        payload = data;
      }
    } else {
      payload = String(data);
    }
    
    // Publish message to MQTT broker
    mqttClient.publish(topic, payload, { qos, retain }, (error) => {
      if (error) {
        console.error('❌ MQTT publish error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to publish message',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`📤 Command sent to ${deviceId}:`);
      console.log(`   Topic: ${topic}`);
      console.log(`   Payload: ${payload}`);
      console.log(`   QoS: ${qos}, Retain: ${retain}`);
      
      // Log the command in Redis
      if (redisConnected) {
        redisService.storeLog({
          deviceId: deviceId,
          level: 'info',
          message: `Command sent via web interface`,
          topic: topic,
          data: {
            command: 'web_send',
            payload: payload,
            qos: qos,
            retain: retain,
            sentBy: 'web-server'
          }
        });
      }
      
      res.json({
        success: true,
        deviceId: deviceId,
        topic: topic,
        payload: payload,
        qos: qos,
        retain: retain,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('❌ Command error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { deviceId, level, limit = 100 } = req.query;
    let logs = [];
    
    if (redisConnected) {
      if (deviceId) {
        logs = await redisService.getDeviceLogs(deviceId, parseInt(limit));
      } else {
        logs = await redisService.getAllLogs(parseInt(limit));
      }
      
      // Filter by level if specified
      if (level) {
        logs = logs.filter(log => log.level === level);
      }
    } else {
      // Fallback logs
      logs = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'info',
          deviceId: 'ESP32_001',
          message: 'Device started successfully',
          topic: 'system/startup',
          data: { firmware: 'v1.2.3', uptime: 0 }
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'warning',
          deviceId: 'ESP32_002',
          message: 'High temperature detected',
          topic: 'sensor/alert',
          data: { temperature: 85, threshold: 80 }
        }
      ];
      
      // Apply filters
      if (deviceId) {
        logs = logs.filter(log => log.deviceId === deviceId);
      }
      if (level) {
        logs = logs.filter(log => log.level === level);
      }
    }
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      filters: { deviceId, level, limit },
      source: redisConnected ? 'redis' : 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load logs',
      logs: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    let topics = [];
    
    if (redisConnected) {
      // Get real topics from Redis
      topics = await redisService.getAllActiveTopics();
      
      // Enhance with topic stats
      const topicStats = await redisService.getTopicStats();
      topics = topics.map(topic => ({
        ...topic,
        messageCount: topicStats[topic.name]?.messages || 0,
        lastMessage: topicStats[topic.name]?.lastMessage || null,
        qos: 0,
        retained: false,
        description: `Active topic: ${topic.name}`
      }));
    } else {
      // Fallback topics
      topics = [
        {
          name: 'iot/device/register',
          type: 'system',
          status: 'active',
          messageCount: 15,
          lastMessage: new Date().toISOString(),
          subscribers: ['broker', 'monitor'],
          qos: 0,
          retained: false,
          description: 'Device registration messages'
        },
        {
          name: 'iot/device/status',
          type: 'status',
          status: 'active',
          messageCount: 1250,
          lastMessage: new Date(Date.now() - 300000).toISOString(),
          subscribers: ['broker', 'monitor', 'dashboard'],
          qos: 1,
          retained: true,
          description: 'Device status updates'
        },
        {
          name: 'iot/sensor/data',
          type: 'data',
          status: 'active',
          messageCount: 8900,
          lastMessage: new Date(Date.now() - 60000).toISOString(),
          subscribers: ['broker', 'monitor', 'analytics'],
          qos: 0,
          retained: false,
          description: 'Sensor data from IoT devices'
        }
      ];
    }
    
    res.json({
      success: true,
      topics: topics,
      count: topics.length,
      source: redisConnected ? 'redis' : 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load topics',
      topics: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/topics/:topicName/subscribers', async (req, res) => {
  try {
    const { topicName } = req.params;
    let subscribers = [];
    
    if (redisConnected) {
      subscribers = await redisService.getTopicSubscribers(topicName);
    } else {
      // Fallback subscribers
      const fallbackTopics = [
        {
          name: 'iot/device/register',
          subscribers: ['broker', 'monitor']
        },
        {
          name: 'iot/device/status',
          subscribers: ['broker', 'monitor', 'dashboard']
        },
        {
          name: 'iot/sensor/data',
          subscribers: ['broker', 'monitor', 'analytics']
        }
      ];
      
      const topic = fallbackTopics.find(t => t.name === topicName);
      subscribers = topic ? topic.subscribers : [];
    }
    
    res.json({
      success: true,
      topic: topicName,
      subscribers: subscribers,
      count: subscribers.length,
      source: redisConnected ? 'redis' : 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting topic subscribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscribers',
      subscribers: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const redisHealth = redisConnected ? await redisService.isHealthy() : false;
    
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      redis: {
        connected: redisConnected,
        healthy: redisHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  // Initialize Redis connection
  await initializeRedis();
  
  // Initialize MQTT connection
  await initializeMQTT();
  
  app.listen(PORT, () => {
    console.log(`🚀 IoT Web Server running on http://localhost:${PORT}`);
    console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
    console.log(`🔗 Devices API: http://localhost:${PORT}/api/devices`);
    console.log(`📝 Logs API: http://localhost:${PORT}/api/logs`);
    console.log(`📡 Topics API: http://localhost:${PORT}/api/topics`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log(`🔗 Redis Status: ${redisConnected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📡 MQTT Status: ${mqttConnected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log('');
    console.log('💡 Usage:');
    console.log('   1. Start web app: cd ../web-app && npm start');
    console.log('   2. Web app will connect to this server automatically');
    console.log('   3. Make sure MQTT broker is running for real data');
    console.log('   4. Use Control tab to send commands to devices');
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down web server...');
  
  // Disconnect MQTT client
  if (mqttClient && mqttConnected) {
    mqttClient.end();
    console.log('✅ MQTT client disconnected');
  }
  
  // Disconnect Redis
  if (redisConnected) {
    await redisService.disconnect();
    console.log('✅ Redis disconnected');
  }
  
  process.exit(0);
});
