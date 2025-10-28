const mqtt = require('mqtt');
const config = require('../broker/config');

// Device Manager - Acts as a central controller for IoT devices
const IOT_TOPICS = {
  DEVICE_REGISTER: 'iot/device/register',
  DEVICE_STATUS: 'iot/device/status',
  DEVICE_DATA: 'iot/device/data',
  DEVICE_COMMAND: 'iot/device/command',
  DEVICE_RESPONSE: 'iot/device/response',
  SENSOR_DATA: 'iot/sensor/data',
  ACTUATOR_CONTROL: 'iot/actuator/control',
  DEVICE_HEARTBEAT: 'iot/device/heartbeat'
};

// Device registry
const deviceRegistry = new Map();
const deviceResponses = new Map();

// Create MQTT client for device manager
const client = mqtt.connect(`mqtt://localhost:${config.mqttPort}`, {
  clientId: 'device-manager',
  clean: true,
  connectTimeout: 4000,
  username: config.requireAuth ? 'admin' : undefined,
  password: config.requireAuth ? 'password123' : undefined,
  reconnectPeriod: 1000
});

// Connection event handlers
client.on('connect', function () {
  console.log('✅ Device Manager Connected');
  
  // Subscribe to all IoT topics
  Object.values(IOT_TOPICS).forEach(topic => {
    client.subscribe(topic, function (err) {
      if (!err) {
        console.log(`📡 Subscribed to ${topic}`);
      }
    });
  });
  
  // Subscribe to device-specific topics
  client.subscribe('iot/device/+/command', function (err) {
    if (!err) {
      console.log('📡 Subscribed to device commands');
    }
  });
  
  client.subscribe('iot/device/+/response', function (err) {
    if (!err) {
      console.log('📡 Subscribed to device responses');
    }
  });
  
  // Start device monitoring
  setTimeout(() => {
    startDeviceMonitoring();
  }, 2000);
});

// Handle incoming messages
client.on('message', function (topic, message) {
  try {
    const data = JSON.parse(message.toString());
    
    switch (topic) {
      case IOT_TOPICS.DEVICE_REGISTER:
        handleDeviceRegistration(data);
        break;
      case IOT_TOPICS.DEVICE_STATUS:
        handleDeviceStatus(data);
        break;
      case IOT_TOPICS.SENSOR_DATA:
        handleSensorData(data);
        break;
      case IOT_TOPICS.DEVICE_HEARTBEAT:
        handleDeviceHeartbeat(data);
        break;
      case IOT_TOPICS.DEVICE_RESPONSE:
        handleDeviceResponse(data);
        break;
      default:
        if (topic.includes('/response')) {
          handleDeviceResponse(data);
        }
    }
  } catch (e) {
    console.log(`📨 Raw message on ${topic}: ${message.toString()}`);
  }
});

// Handle device registration
function handleDeviceRegistration(data) {
  console.log(`\n📋 DEVICE REGISTRATION`);
  console.log(`   Device ID: ${data.deviceId}`);
  console.log(`   Type: ${data.deviceType}`);
  console.log(`   Location: ${data.location}`);
  console.log(`   Firmware: ${data.firmware}`);
  console.log(`   Capabilities: ${data.capabilities.join(', ')}`);
  console.log(`   ──────────────────────────────────────`);
  
  // Register device
  deviceRegistry.set(data.deviceId, {
    ...data,
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: 'online',
    messageCount: 0
  });
  
  // Send welcome command
  setTimeout(() => {
    sendDeviceCommand(data.deviceId, {
      commandId: 'welcome',
      action: 'initialize',
      parameters: {
        timezone: 'UTC',
        reportingInterval: 5000
      }
    });
  }, 1000);
}

// Handle device status updates
function handleDeviceStatus(data) {
  if (deviceRegistry.has(data.deviceId)) {
    const device = deviceRegistry.get(data.deviceId);
    device.status = data.status;
    device.lastSeen = new Date().toISOString();
    deviceRegistry.set(data.deviceId, device);
    
    console.log(`📊 Device Status Update: ${data.deviceId} is ${data.status}`);
  }
}

// Handle sensor data
function handleSensorData(data) {
  if (deviceRegistry.has(data.deviceId)) {
    const device = deviceRegistry.get(data.deviceId);
    device.messageCount++;
    device.lastSeen = new Date().toISOString();
    deviceRegistry.set(data.deviceId, device);
    
    // Check for alerts
    checkSensorAlerts(data);
  }
}

// Handle device heartbeat
function handleDeviceHeartbeat(data) {
  if (deviceRegistry.has(data.deviceId)) {
    const device = deviceRegistry.get(data.deviceId);
    device.lastSeen = new Date().toISOString();
    device.uptime = data.uptime;
    device.memory = data.memory;
    deviceRegistry.set(data.deviceId, device);
    
    console.log(`💓 Heartbeat from ${data.deviceId}: Uptime=${data.uptime.toFixed(2)}s, Memory=${(data.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
}

// Handle device responses
function handleDeviceResponse(data) {
  console.log(`📤 Device Response: ${data.deviceId} - ${data.status}`);
  deviceResponses.set(data.commandId || 'unknown', data);
}

// Check for sensor alerts
function checkSensorAlerts(sensorData) {
  const alerts = [];
  
  if (sensorData.sensors.temperature) {
    const temp = parseFloat(sensorData.sensors.temperature.value);
    if (temp > 30) {
      alerts.push({
        type: 'temperature_high',
        deviceId: sensorData.deviceId,
        value: temp,
        threshold: 30,
        message: `High temperature alert: ${temp}°C`
      });
    }
  }
  
  if (sensorData.sensors.humidity) {
    const humidity = parseFloat(sensorData.sensors.humidity.value);
    if (humidity > 80) {
      alerts.push({
        type: 'humidity_high',
        deviceId: sensorData.deviceId,
        value: humidity,
        threshold: 80,
        message: `High humidity alert: ${humidity}%`
      });
    }
  }
  
  alerts.forEach(alert => {
    console.log(`🚨 ALERT: ${alert.message}`);
    // In a real system, you would send notifications, log to database, etc.
  });
}

// Send command to device
function sendDeviceCommand(deviceId, command) {
  const commandData = {
    ...command,
    timestamp: new Date().toISOString()
  };
  
  const topic = `iot/device/${deviceId}/command`;
  client.publish(topic, JSON.stringify(commandData), { qos: 1 });
  console.log(`⚙️  Command sent to ${deviceId}: ${command.action}`);
}

// Start device monitoring
function startDeviceMonitoring() {
  console.log('\n🔍 Starting device monitoring...');
  
  // Monitor device health every 30 seconds
  setInterval(() => {
    const now = new Date();
    const offlineDevices = [];
    
    deviceRegistry.forEach((device, deviceId) => {
      const lastSeen = new Date(device.lastSeen);
      const timeDiff = (now - lastSeen) / 1000; // seconds
      
      if (timeDiff > 60 && device.status === 'online') {
        offlineDevices.push(deviceId);
        device.status = 'offline';
        deviceRegistry.set(deviceId, device);
      }
    });
    
    if (offlineDevices.length > 0) {
      console.log(`⚠️  Devices offline: ${offlineDevices.join(', ')}`);
    }
  }, 30000);
  
  // Print device statistics every 2 minutes
  setInterval(() => {
    if (deviceRegistry.size > 0) {
      console.log(`\n📊 DEVICE REGISTRY STATUS`);
      console.log(`   Total Devices: ${deviceRegistry.size}`);
      deviceRegistry.forEach((device, deviceId) => {
        console.log(`   - ${deviceId}: ${device.status}, Messages: ${device.messageCount}, Last seen: ${device.lastSeen}`);
      });
      console.log(`   ──────────────────────────────────────`);
    }
  }, 120000);
}

// Error handling
client.on('error', function (error) {
  console.error('❌ Device Manager Error:', error);
});

client.on('close', function () {
  console.log('🔌 Device Manager disconnected');
});

client.on('offline', function () {
  console.log('📴 Device Manager offline');
});

// Graceful shutdown
process.on('SIGINT', function () {
  console.log('\n🛑 Shutting down device manager...');
  
  // Send shutdown commands to all devices
  deviceRegistry.forEach((device, deviceId) => {
    if (device.status === 'online') {
      sendDeviceCommand(deviceId, {
        commandId: 'shutdown',
        action: 'shutdown',
        parameters: {}
      });
    }
  });
  
  client.end(() => {
    console.log('✅ Device manager stopped');
    process.exit(0);
  });
});

console.log('🚀 Starting Device Manager...');
console.log(`🔗 Connecting to: mqtt://localhost:${config.mqttPort}`);
