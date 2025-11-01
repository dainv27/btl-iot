const aedes = require('aedes')();
const net = require('net');
const ws = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const RedisService = require('./redis-service');

const connectedDevices = new Map();
const deviceData = new Map();
const redisService = new RedisService();
const app = express();
let webServerInstance = null;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../web/public')));

const server = net.createServer(aedes.handle);
const wsServer = new ws.Server({ port: config.wsPort });

wsServer.on('connection', function (socket) {
  const stream = ws.createWebSocketStream(socket);
  aedes.handle(stream);
});

const realtimeWsServer = new ws.Server({ port: config.wsPort + 1 });
const realtimeClients = new Set();

realtimeWsServer.on('connection', function (socket) {
  console.log(`✅ Real-time WebSocket client connected`);
  realtimeClients.add(socket);
  
  socket.on('close', function () {
    console.log(`❌ Real-time WebSocket client disconnected`);
    realtimeClients.delete(socket);
  });
  
  socket.on('error', function (error) {
    console.error('❌ Real-time WebSocket error:', error);
    realtimeClients.delete(socket);
  });
});

const IOT_TOPICS = {
  DEVICE_REGISTER: 'iot/device/register',
  DEVICE_STATUS: 'iot/device/status',
  DEVICE_DATA: 'iot/device/data',
  SENSOR_DATA: 'iot/sensor/data', // Base topic for sensor data
  SENSOR_CTL: 'iot/sensor/ctl',   // Base topic for sensor control
  ACTUATOR_CONTROL: 'iot/actuator/control',
  DEVICE_HEARTBEAT: 'iot/device/heartbeat'
};

function isIoTDeviceTopic(topic) {
  return topic.startsWith('iot/');
}

function extractDeviceId(topic) {
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'iot') {
    if (parts[1] === 'device' && parts.length >= 3) {
      return parts[2];
    } else if (parts[1] === 'sensor' && parts.length >= 4) {
      return parts[3];
    }
  }
  return null;
}

function formatIoTData(topic, payload, deviceId) {
  try {
    const data = JSON.parse(payload.toString());
    return {
      deviceId: deviceId || 'unknown',
      topic: topic,
      timestamp: new Date().toISOString(),
      data: data,
      size: payload.length
    };
  } catch (e) {
    return {
      deviceId: deviceId || 'unknown',
      topic: topic,
      timestamp: new Date().toISOString(),
      data: payload.toString(),
      size: payload.length
    };
  }
}

function checkSensorAlerts(sensorData, timestamp) {
  if (!sensorData.sensors) return;
  
  const alerts = [];
  
  if (sensorData.sensors.temperature) {
    const temp = parseFloat(sensorData.sensors.temperature.value);
    if (temp > 30) {
      alerts.push({
        deviceId: sensorData.deviceId,
        type: 'temperature_high',
        message: `High temperature alert: ${temp}°C`,
        value: temp,
        threshold: 30,
        timestamp: timestamp
      });
    } else if (temp < -10) {
      alerts.push({
        deviceId: sensorData.deviceId,
        type: 'temperature_low',
        message: `Low temperature alert: ${temp}°C`,
        value: temp,
        threshold: -10,
        timestamp: timestamp
      });
    }
  }
  
  if (sensorData.sensors.humidity) {
    const humidity = parseFloat(sensorData.sensors.humidity.value);
    if (humidity > 80) {
      alerts.push({
        deviceId: sensorData.deviceId,
        type: 'humidity_high',
        message: `High humidity alert: ${humidity}%`,
        value: humidity,
        threshold: 80,
        timestamp: timestamp
      });
    } else if (humidity < 20) {
      alerts.push({
        deviceId: sensorData.deviceId,
        type: 'humidity_low',
        message: `Low humidity alert: ${humidity}%`,
        value: humidity,
        threshold: 20,
        timestamp: timestamp
      });
    }
  }
  
  alerts.forEach(alert => {
    redisService.storeAlert(alert);
    console.log(`🚨 ALERT: ${alert.message} (Device: ${alert.deviceId})`);
  });
}

aedes.on('client', function (client) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔌 Client Connected: ${client.id}`);
  
  redisService.storeLog({
    deviceId: client.id,
    level: 'info',
    message: `Client connected: ${client.id}`,
    topic: 'system/connection',
    data: { clientId: client.id, timestamp: timestamp }
  });
  
  if (client.id.startsWith('iot-') || client.id.includes('device')) {
    connectedDevices.set(client.id, {
      id: client.id,
      connectedAt: timestamp,
      lastSeen: timestamp,
      messageCount: 0
    });
    console.log(`[${timestamp}] 📱 IoT Device Registered: ${client.id}`);
    
    redisService.storeDevice(client.id, {
      deviceId: client.id,
      status: 'online',
      connectedAt: timestamp,
      lastSeen: timestamp,
      messageCount: 0
    });
  }
});

aedes.on('clientDisconnect', function (client) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔌 Client Disconnected: ${client.id}`);
  
  redisService.storeLog({
    deviceId: client.id,
    level: 'info',
    message: `Client disconnected: ${client.id}`,
    topic: 'system/disconnection',
    data: { clientId: client.id, timestamp: timestamp }
  });
  
  if (connectedDevices.has(client.id)) {
    const device = connectedDevices.get(client.id);
    console.log(`[${timestamp}] 📱 IoT Device Disconnected: ${client.id} (Messages: ${device.messageCount})`);
    
    redisService.updateDeviceStatus(client.id, 'offline', timestamp);
    
    connectedDevices.delete(client.id);
  }
});

aedes.on('publish', function (packet, client) {
  if (client) {
    const timestamp = new Date().toISOString();
    const deviceId = extractDeviceId(packet.topic);
    
    if (isIoTDeviceTopic(packet.topic)) {
      const iotData = formatIoTData(packet.topic, packet.payload, deviceId);
      
      if (connectedDevices.has(client.id)) {
        const device = connectedDevices.get(client.id);
        device.messageCount++;
        device.lastSeen = timestamp;
        connectedDevices.set(client.id, device);
        
        redisService.incrementDeviceMessageCount(client.id);
        redisService.updateDeviceStatus(client.id, 'online', timestamp);
      }
      
      if (deviceId) {
        if (!deviceData.has(deviceId)) {
          deviceData.set(deviceId, []);
        }
        const data = deviceData.get(deviceId);
        data.push(iotData);
        if (data.length > 100) {
          data.shift();
        }
        
        redisService.storeLog({
          deviceId: deviceId,
          level: 'info',
          message: `Message published to ${packet.topic}`,
          topic: packet.topic,
          data: iotData.data
        });
      }
      
      redisService.storeTopicStats(packet.topic, {
        subscribers: 0, // This would need to be tracked separately
        messages: 1,
        lastMessage: timestamp
      });
      
      console.log(`\n[${timestamp}] 📱 IoT DEVICE DATA`);
      console.log(`   Device ID: ${iotData.deviceId}`);
      console.log(`   Topic: ${iotData.topic}`);
      console.log(`   Data: ${JSON.stringify(iotData.data, null, 2)}`);
      console.log(`   Size: ${iotData.size} bytes`);
      console.log(`   QoS: ${packet.qos}`);
      console.log(`   Retain: ${packet.retain ? 'Yes' : 'No'}`);
      
      if (packet.topic === IOT_TOPICS.DEVICE_REGISTER) {
        console.log(`   📋 Device Registration Data`);
        if (iotData.data && iotData.data.deviceId) {
          redisService.storeDevice(iotData.data.deviceId, {
            ...iotData.data,
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            messageCount: 0
          });
        }
      } else if (packet.topic === IOT_TOPICS.DEVICE_STATUS) {
        console.log(`   📊 Device Status Update`);
        if (iotData.data && iotData.data.deviceId) {
          redisService.updateDeviceStatus(iotData.data.deviceId, iotData.data.status, new Date().toISOString());
        }
      } else if (packet.topic === IOT_TOPICS.DEVICE_HEARTBEAT) {
        console.log(`   💓 Device Heartbeat`);
        if (iotData.data && iotData.data.deviceId) {
          redisService.storeDevice(iotData.data.deviceId, {
            deviceId: iotData.data.deviceId,
            status: 'online',
            lastSeen: new Date().toISOString(),
            uptime: iotData.data.uptime,
            memory: iotData.data.memory
          });
        }
      } else if (packet.topic.startsWith(`${IOT_TOPICS.SENSOR_DATA}/`)) {
        console.log(`   🌡️  Sensor Data Received (Device-specific)`);
        if (iotData.data && iotData.data.deviceId) {
          redisService.storeSensorData(iotData.data.deviceId, iotData.data);
          
          // Broadcast sensor data via WebSocket
          if (iotData.data.temperature !== undefined || iotData.data.humidity !== undefined) {
            const wsMessage = JSON.stringify({
              type: 'sensor_data',
              deviceId: iotData.data.deviceId,
              data: {
                deviceId: iotData.data.deviceId,
                temperature: iotData.data.temperature,
                humidity: iotData.data.humidity,
                timestamp: iotData.data.timestamp || Date.now()
              },
              timestamp: timestamp
            });
            
            realtimeClients.forEach(client => {
              if (client.readyState === ws.OPEN) {
                try {
                  client.send(wsMessage);
                } catch (error) {
                  console.error('Error sending WebSocket message:', error);
                  realtimeClients.delete(client);
                }
              }
            });
          }
          
          // Check for sensor alerts
          checkSensorAlerts(iotData.data, timestamp);
        }
      } else if (packet.topic.startsWith(`${IOT_TOPICS.SENSOR_CTL}/`)) {
        console.log(`   🔧 Sensor Control Command`);
        console.log(`   📤 Forwarding sensor control to device: ${deviceId}`);
      } else if (packet.topic.includes('sensor/data') && packet.topic.includes('/response')) {
        console.log(`   📤 Sensor Control Response`);
      } else if (packet.topic.includes('sensor')) {
        console.log(`   📡 Sensor Data`);
        if (iotData.data && iotData.data.deviceId) {
          redisService.storeSensorData(iotData.data.deviceId, iotData.data);
          
          // Check for sensor alerts
          checkSensorAlerts(iotData.data, timestamp);
        }
      } else if (packet.topic.includes('actuator')) {
        console.log(`   ⚙️  Actuator Control`);
      } else {
        console.log(`   📱 IoT Device Data`);
      }
      console.log(`   ──────────────────────────────────────`);
      
    } else {
      // Regular logging for non-IoT topics
      console.log(`[${timestamp}] 📨 Message from ${client.id} to topic "${packet.topic}": ${packet.payload.toString()}`);
    }
  } else {
    // Log publish errors when no client context
    redisService.storeLog({
      deviceId: 'unknown',
      level: 'warn',
      message: `Message published without client context to topic: ${packet.topic}`,
      topic: packet.topic,
      data: { payload: packet.payload.toString() }
    });
  }
});

aedes.on('subscribe', function (subscriptions, client) {
  const timestamp = new Date().toISOString();
  const topics = subscriptions.map(s => s.topic).join(', ');
  console.log(`[${timestamp}] 📡 Client ${client.id} subscribed to topics: ${topics}`);
  
  // Store subscriptions in Redis
  subscriptions.forEach(subscription => {
    redisService.storeSubscription(client.id, subscription.topic, subscription.qos);
  });
  
  // Log IoT-specific subscriptions
  const iotTopics = subscriptions.filter(s => isIoTDeviceTopic(s.topic));
  if (iotTopics.length > 0) {
    console.log(`[${timestamp}] 📱 IoT Device ${client.id} subscribed to IoT topics: ${iotTopics.map(s => s.topic).join(', ')}`);
  }
});

aedes.on('unsubscribe', function (subscriptions, client) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📡 Client ${client.id} unsubscribed from topics: ${subscriptions.join(', ')}`);
  
  // Remove subscriptions from Redis
  subscriptions.forEach(topic => {
    redisService.removeSubscription(client.id, topic);
  });
});

// Authentication handler (optional)
aedes.authenticate = function (client, username, password, callback) {
  // Simple authentication - in production, implement proper authentication
  if (config.requireAuth) {
    const validUser = config.users.find(user => user.username === username && user.password === password);
    callback(null, !!validUser);
  } else {
    callback(null, true);
  }
};

// Authorization handler (optional)
aedes.authorizePublish = function (client, packet, callback) {
  // Allow all publishes for now - implement proper authorization in production
  callback(null);
};

aedes.authorizeSubscribe = function (client, sub, callback) {
  // Allow all subscriptions for now - implement proper authorization in production
  callback(null, sub);
};

setInterval(() => {
  if (connectedDevices.size > 0) {
    console.log(`\n[${new Date().toISOString()}] 📊 DEVICE STATISTICS`);
    console.log(`   Connected IoT Devices: ${connectedDevices.size}`);
    connectedDevices.forEach((device, deviceId) => {
      console.log(`   - ${deviceId}: ${device.messageCount} messages, connected since ${device.connectedAt}`);
    });
    console.log(`   ──────────────────────────────────────`);
  }
}, 60000);

// ==================== Web Server API Routes ====================

// API Routes
app.get('/api/status', async (req, res) => {
  try {
    const redisHealth = redisService.isConnected ? await redisService.isHealthy() : false;
    
    res.json({
      broker: {
        mqttPort: config.mqttPort,
        wsPort: config.wsPort,
        status: 'running'
      },
      server: {
        port: config.webPort,
        status: 'running',
        uptime: process.uptime()
      },
      redis: {
        connected: redisService.isConnected,
        healthy: redisHealth
      },
      mqtt: {
        connected: true,
        brokerId: aedes.id
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
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        devices: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    let devices = await redisService.getAllDevices();
    
    for (let device of devices) {
      const sensorData = await redisService.getLatestSensorData(device.deviceId);
      if (sensorData) {
        device.lastSensorData = sensorData;
      }
    }
    
    res.json({
      success: true,
      devices: devices,
      count: devices.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load devices',
      devices: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/devices/:deviceId', async (req, res) => {
  try {
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        device: null,
        timestamp: new Date().toISOString()
      });
    }
    
    const { deviceId } = req.params;
    const device = await redisService.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        device: null,
        timestamp: new Date().toISOString()
      });
    }
    
    const sensorData = await redisService.getLatestSensorData(deviceId);
    if (sensorData) {
      device.lastSensorData = sensorData;
    }
    
    res.json({
      success: true,
      device: device,
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

app.get('/api/sensor-data/:deviceId', async (req, res) => {
  try {
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    const { deviceId } = req.params;
    const sensorDataObj = await redisService.getLatestSensorData(deviceId);
    
    if (!sensorDataObj || !sensorDataObj.data) {
      return res.status(404).json({
        success: false,
        error: 'Sensor data not found for device',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    const sensorData = sensorDataObj.data;
    
    res.json({
      success: true,
      data: {
        deviceId: sensorData.deviceId || deviceId,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        timestamp: sensorData.timestamp || sensorDataObj.timestamp
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sensor data',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// Send command to device via MQTT
app.post('/api/devices/:deviceId/command', async (req, res) => {
  console.log('[DEBUG] Command request received');
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { deviceId } = req.params;
    const { topic, data, qos = 0, retain = false } = req.body;
    
    console.log('[DEBUG] Parsed values:', { deviceId, topic, qos, retain, dataType: typeof data });
    
    if (!topic) {
      console.warn('[DEBUG] Topic validation failed: topic is required');
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[DEBUG] Processing payload, data type:', typeof data);
    let payload;
    if (typeof data === 'object') {
      payload = JSON.stringify(data);
      console.log('[DEBUG] Data is object, stringified:', payload);
    } else if (typeof data === 'string') {
      try {
        JSON.parse(data);
        payload = data;
        console.log('[DEBUG] Data is valid JSON string');
      } catch (e) {
        payload = data;
        console.log('[DEBUG] Data is plain text string');
      }
    } else {
      payload = String(data);
      console.log('[DEBUG] Data converted to string:', payload);
    }
    
    console.log('[DEBUG] Final payload:', payload);
    console.log('[DEBUG] Payload length:', payload.length);
    
    // Publish message to MQTT broker using aedes
    try {
      const packet = {
        topic: topic,
        payload: Buffer.from(payload),
        qos: qos,
        retain: retain
      };
      
      // Publish message using aedes (synchronous operation)
      aedes.publish(packet);
      
      console.log(`📤 Command sent to ${deviceId}:`);
      console.log(`   Topic: ${topic}`);
      console.log(`   Payload: ${payload}`);
      console.log(`   QoS: ${qos}, Retain: ${retain}`);
      
      // Log the command in Redis
      if (redisService.isConnected) {
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
    } catch (error) {
      console.error('❌ MQTT publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish message',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
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
    
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        logs: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    let logs = [];
    if (deviceId) {
      logs = await redisService.getDeviceLogs(deviceId, parseInt(limit));
    } else {
      logs = await redisService.getAllLogs(parseInt(limit));
    }
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      filters: { deviceId, level, limit },
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
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        topics: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    let topics = await redisService.getAllActiveTopics();
    
    const topicStats = await redisService.getTopicStats();
    topics = topics.map(topic => ({
      ...topic,
      messageCount: topicStats[topic.name]?.messages || 0,
      lastMessage: topicStats[topic.name]?.lastMessage || null,
      qos: 0,
      retained: false,
      description: `Active topic: ${topic.name}`
    }));
    
    res.json({
      success: true,
      topics: topics,
      count: topics.length,
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
    if (!redisService.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Redis service is not available',
        topic: req.params.topicName,
        subscribers: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const { topicName } = req.params;
    const subscribers = await redisService.getTopicSubscribers(topicName);
    
    res.json({
      success: true,
      topic: topicName,
      subscribers: subscribers,
      count: subscribers.length,
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
    const redisHealth = redisService.isConnected ? await redisService.isHealthy() : false;
    
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      redis: {
        connected: redisService.isConnected,
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

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/public/index.html'));
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

// ==================== End Web Server API Routes ====================

// Initialize Redis and start servers
async function startServer() {
    // Connect to Redis
    console.log('🔗 Connecting to Redis...');
    const redisConnected = await redisService.connect(config.redisUrl);
    
    if (redisConnected) {
        console.log('✅ Redis connected successfully');
        
        // Clean Redis data after connection
        console.log('🧹 Cleaning Redis data...');
        try {
            const cleaned = await redisService.cleanAllData();
            if (cleaned) {
                console.log('✅ Redis data cleaned successfully');
            } else {
                console.log('⚠️  Redis data cleanup failed');
            }
        } catch (error) {
            console.error('❌ Error cleaning Redis data:', error);
        }
    } else {
        console.log('⚠️  Redis connection failed - continuing without persistence');
    }
    
    // Start the MQTT broker
    server.listen(config.mqttPort, function () {
        console.log(`🚀 MQTT Broker started on port ${config.mqttPort}`);
        console.log(`🌐 WebSocket server started on port ${config.wsPort}`);
        console.log(`🌐 Real-time WebSocket server started on port ${config.wsPort + 1}`);
        console.log(`📊 Broker ID: ${aedes.id}`);
        console.log(`🔐 Authentication: ${config.requireAuth ? 'Enabled' : 'Disabled'}`);
    });
    
    // Start the web server
    webServerInstance = app.listen(config.webPort, () => {
        console.log(`\n🌐 Web Dashboard started on port ${config.webPort}`);
        console.log(`📊 Dashboard: http://localhost:${config.webPort}`);
        console.log(`📡 API Status: http://localhost:${config.webPort}/api/status`);
        console.log(`🔗 Devices API: http://localhost:${config.webPort}/api/devices`);
        console.log(`📝 Logs API: http://localhost:${config.webPort}/api/logs`);
        console.log(`📡 Topics API: http://localhost:${config.webPort}/api/topics`);
        console.log(`💚 Health Check: http://localhost:${config.webPort}/api/health`);
        console.log('\n📝 MQTT Usage:');
        console.log(`   MQTT: mqtt://localhost:${config.mqttPort}`);
        console.log(`   WebSocket: ws://localhost:${config.wsPort}`);
        console.log('\n📱 IoT Device Topics:');
        console.log(`   Device Registration: ${IOT_TOPICS.DEVICE_REGISTER}`);
        console.log(`   Device Status: ${IOT_TOPICS.DEVICE_STATUS}`);
        console.log(`   Device Data: ${IOT_TOPICS.DEVICE_DATA}`);
        console.log(`   Sensor Data: ${IOT_TOPICS.SENSOR_DATA}`);
        console.log(`   Device Heartbeat: ${IOT_TOPICS.DEVICE_HEARTBEAT}`);
        console.log(`   Actuator Control: ${IOT_TOPICS.ACTUATOR_CONTROL}`);
        console.log('\n💡 Test with: npm run test');
        console.log('💡 Test IoT devices with: npm run test:iot');
    });
}

startServer();

// Graceful shutdown
process.on('SIGINT', async function () {
  console.log('\n🛑 Shutting down MQTT broker and web server...');
  
  // Disconnect Redis
  await redisService.disconnect();
  
  // Close web server
  if (webServerInstance) {
    webServerInstance.close(() => {
      console.log('✅ Web server stopped');
    });
  }
  
  server.close(() => {
    wsServer.close(() => {
      aedes.close(() => {
        console.log('✅ MQTT broker stopped');
        process.exit(0);
      });
    });
  });
});

// Error handling
server.on('error', function (err) {
  console.error('❌ Server error:', err);
  
  // Log error to Redis
  redisService.storeLog({
    deviceId: 'broker',
    level: 'error',
    message: `Server error: ${err.message}`,
    topic: 'system/error',
    data: { error: err.message, stack: err.stack }
  });
});

aedes.on('error', function (err) {
  console.error('❌ Broker error:', err);
  
  // Log error to Redis
  redisService.storeLog({
    deviceId: 'broker',
    level: 'error',
    message: `Broker error: ${err.message}`,
    topic: 'system/error',
    data: { error: err.message, stack: err.stack }
  });
});

