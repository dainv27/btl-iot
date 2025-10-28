const aedes = require('aedes')();
const net = require('net');
const ws = require('ws');
const config = require('./config');
const RedisService = require('./redis-service');

// IoT Device Management
const connectedDevices = new Map();
const deviceData = new Map();

// Redis Service
const redisService = new RedisService();

// Create MQTT broker instance
const server = net.createServer(aedes.handle);
const wsServer = new ws.Server({ port: config.wsPort });

// WebSocket server for MQTT over WebSocket
wsServer.on('connection', function (socket) {
  const stream = ws.createWebSocketStream(socket);
  aedes.handle(stream);
});

// IoT Device Topic Structure
const IOT_TOPICS = {
  DEVICE_REGISTER: 'iot/device/register',
  DEVICE_STATUS: 'iot/device/status',
  DEVICE_DATA: 'iot/device/data',
  DEVICE_COMMAND: 'iot/device/command',
  DEVICE_RESPONSE: 'iot/device/response',
  SENSOR_DATA: 'iot/sensor/data', // Base topic for sensor data
  SENSOR_CTL: 'iot/sensor/ctl',   // Base topic for sensor control
  ACTUATOR_CONTROL: 'iot/actuator/control',
  DEVICE_HEARTBEAT: 'iot/device/heartbeat'
};

// Utility function to check if topic is IoT related
function isIoTDeviceTopic(topic) {
  return topic.startsWith('iot/');
}

// Utility function to extract device ID from topic
function extractDeviceId(topic) {
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'iot') {
    // Handle different IoT topic formats:
    // iot/device/{deviceId}/...
    // iot/sensor/data/{deviceId}
    // iot/sensor/ctl/{deviceId}
    if (parts[1] === 'device' && parts.length >= 3) {
      return parts[2]; // iot/device/{deviceId}/...
    } else if (parts[1] === 'sensor' && parts.length >= 4) {
      return parts[3]; // iot/sensor/data/{deviceId} or iot/sensor/ctl/{deviceId}
    }
  }
  return null;
}

// Utility function to format IoT data for logging
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

// Sensor alert checking function
function checkSensorAlerts(sensorData, timestamp) {
  if (!sensorData.sensors) return;
  
  const alerts = [];
  
  // Temperature alerts
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
  
  // Humidity alerts
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
  
  // Store alerts in Redis
  alerts.forEach(alert => {
    redisService.storeAlert(alert);
    console.log(`🚨 ALERT: ${alert.message} (Device: ${alert.deviceId})`);
  });
}

// Event handlers for broker
aedes.on('client', function (client) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔌 Client Connected: ${client.id}`);
  
  // Log client connection
  redisService.storeLog({
    deviceId: client.id,
    level: 'info',
    message: `Client connected: ${client.id}`,
    topic: 'system/connection',
    data: { clientId: client.id, timestamp: timestamp }
  });
  
  // Check if this is an IoT device based on client ID pattern
  if (client.id.startsWith('iot-') || client.id.includes('device')) {
    connectedDevices.set(client.id, {
      id: client.id,
      connectedAt: timestamp,
      lastSeen: timestamp,
      messageCount: 0
    });
    console.log(`[${timestamp}] 📱 IoT Device Registered: ${client.id}`);
    
    // Store device connection in Redis
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
  
  // Log client disconnection
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
    
    // Update device status in Redis
    redisService.updateDeviceStatus(client.id, 'offline', timestamp);
    
    connectedDevices.delete(client.id);
  }
});

aedes.on('publish', function (packet, client) {
  if (client) {
    const timestamp = new Date().toISOString();
    const deviceId = extractDeviceId(packet.topic);
    
    if (isIoTDeviceTopic(packet.topic)) {
      // Enhanced IoT device logging
      const iotData = formatIoTData(packet.topic, packet.payload, deviceId);
      
      // Update device statistics
      if (connectedDevices.has(client.id)) {
        const device = connectedDevices.get(client.id);
        device.messageCount++;
        device.lastSeen = timestamp;
        connectedDevices.set(client.id, device);
        
        // Update Redis with device info
        redisService.incrementDeviceMessageCount(client.id);
        redisService.updateDeviceStatus(client.id, 'online', timestamp);
      }
      
      // Store device data
      if (deviceId) {
        if (!deviceData.has(deviceId)) {
          deviceData.set(deviceId, []);
        }
        const data = deviceData.get(deviceId);
        data.push(iotData);
        // Keep only last 100 messages per device
        if (data.length > 100) {
          data.shift();
        }
        
        // Log message to Redis
        redisService.storeLog({
          deviceId: deviceId,
          level: 'info',
          message: `Message published to ${packet.topic}`,
          topic: packet.topic,
          data: iotData.data
        });
      }
      
      // Update topic statistics
      redisService.storeTopicStats(packet.topic, {
        subscribers: 0, // This would need to be tracked separately
        messages: 1,
        lastMessage: timestamp
      });
      
      // Enhanced console logging for IoT devices
      console.log(`\n[${timestamp}] 📱 IoT DEVICE DATA`);
      console.log(`   Device ID: ${iotData.deviceId}`);
      console.log(`   Topic: ${iotData.topic}`);
      console.log(`   Data: ${JSON.stringify(iotData.data, null, 2)}`);
      console.log(`   Size: ${iotData.size} bytes`);
      console.log(`   QoS: ${packet.qos}`);
      console.log(`   Retain: ${packet.retain ? 'Yes' : 'No'}`);
      
      // Special handling for different IoT topics
      if (packet.topic === IOT_TOPICS.DEVICE_REGISTER) {
        console.log(`   📋 Device Registration Data`);
        // Store device registration in Redis
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
        // Update device status in Redis
        if (iotData.data && iotData.data.deviceId) {
          redisService.updateDeviceStatus(iotData.data.deviceId, iotData.data.status, new Date().toISOString());
        }
      } else if (packet.topic === IOT_TOPICS.DEVICE_HEARTBEAT) {
        console.log(`   💓 Device Heartbeat`);
        // Update device heartbeat info in Redis
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
        // Store sensor data in Redis
        if (iotData.data && iotData.data.deviceId) {
          redisService.storeSensorData(iotData.data.deviceId, iotData.data);
          
          // Check for sensor alerts
          checkSensorAlerts(iotData.data, timestamp);
        }
      } else if (packet.topic.startsWith(`${IOT_TOPICS.SENSOR_CTL}/`)) {
        console.log(`   🔧 Sensor Control Command`);
        // Handle sensor control commands - could forward to other systems
        console.log(`   📤 Forwarding sensor control to device: ${deviceId}`);
      } else if (packet.topic.includes('sensor/data') && packet.topic.includes('/response')) {
        console.log(`   📤 Sensor Control Response`);
        // Handle sensor control responses
      } else if (packet.topic.includes('sensor')) {
        console.log(`   📡 Sensor Data`);
        // Store sensor data in Redis
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
  
  // Log IoT-specific subscriptions
  const iotTopics = subscriptions.filter(s => isIoTDeviceTopic(s.topic));
  if (iotTopics.length > 0) {
    console.log(`[${timestamp}] 📱 IoT Device ${client.id} subscribed to IoT topics: ${iotTopics.map(s => s.topic).join(', ')}`);
  }
});

aedes.on('unsubscribe', function (subscriptions, client) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📡 Client ${client.id} unsubscribed from topics: ${subscriptions.join(', ')}`);
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

// Device statistics logging
setInterval(() => {
  if (connectedDevices.size > 0) {
    console.log(`\n[${new Date().toISOString()}] 📊 DEVICE STATISTICS`);
    console.log(`   Connected IoT Devices: ${connectedDevices.size}`);
    connectedDevices.forEach((device, deviceId) => {
      console.log(`   - ${deviceId}: ${device.messageCount} messages, connected since ${device.connectedAt}`);
    });
    console.log(`   ──────────────────────────────────────`);
  }
}, 60000); // Log every minute

// Initialize Redis and start servers
async function startServer() {
    // Connect to Redis
    console.log('🔗 Connecting to Redis...');
    const redisConnected = await redisService.connect();
    
    if (redisConnected) {
        console.log('✅ Redis connected successfully');
    } else {
        console.log('⚠️  Redis connection failed - continuing without persistence');
    }
    
    // Start the broker
    server.listen(config.mqttPort, function () {
        console.log(`🚀 MQTT Broker started on port ${config.mqttPort}`);
        console.log(`🌐 WebSocket server started on port ${config.wsPort}`);
        console.log(`📊 Broker ID: ${aedes.id}`);
        console.log(`🔐 Authentication: ${config.requireAuth ? 'Enabled' : 'Disabled'}`);
        console.log('\n📝 Usage:');
        console.log(`   MQTT: mqtt://14.224.166.195:${config.mqttPort}`);
        console.log(`   WebSocket: ws://14.224.166.195:${config.wsPort}`);
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
  console.log('\n🛑 Shutting down MQTT broker...');
  
  // Disconnect Redis
  await redisService.disconnect();
  
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

