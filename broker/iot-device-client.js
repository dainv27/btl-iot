const mqtt = require('mqtt');
const config = require('./config');

// IoT Device Topics
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

// Device configuration
const DEVICE_CONFIG = {
  deviceId: 'iot-device-' + Math.random().toString(16).substr(2, 8),
  deviceType: 'sensor',
  location: 'office',
  firmware: '1.0.0',
  capabilities: ['temperature', 'humidity', 'light']
};

// MQTT host configuration
const mqttHost = config.mqttHost || process.env.MQTT_HOST || 'localhost';

// Create MQTT client for IoT device
const client = mqtt.connect(`mqtt://${mqttHost}:${config.mqttPort}`, {
  clientId: DEVICE_CONFIG.deviceId,
  clean: true,
  connectTimeout: 4000,
  username: config.requireAuth ? 'admin' : undefined,
  password: config.requireAuth ? 'password123' : undefined,
  reconnectPeriod: 1000,
  will: {
    topic: IOT_TOPICS.DEVICE_STATUS,
    payload: JSON.stringify({
      deviceId: DEVICE_CONFIG.deviceId,
      status: 'offline',
      timestamp: new Date().toISOString()
    }),
    qos: 1,
    retain: true
  }
});

// Connection event handlers
client.on('connect', function () {
  console.log(`✅ IoT Device Connected: ${DEVICE_CONFIG.deviceId}`);
  
  // Subscribe to device-specific topics
  client.subscribe(`iot/device/${DEVICE_CONFIG.deviceId}/command`, function (err) {
    if (!err) {
      console.log(`📡 Subscribed to device commands`);
    }
  });
  
  // Subscribe to sensor control topic for this specific device
  const sensorControlTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  client.subscribe(sensorControlTopic, function (err) {
    if (!err) {
      console.log(`📡 Subscribed to sensor control: ${sensorControlTopic}`);
    }
  });
  
  client.subscribe(IOT_TOPICS.ACTUATOR_CONTROL, function (err) {
    if (!err) {
      console.log(`📡 Subscribed to actuator control`);
    }
  });
  
  // Register device
  setTimeout(() => {
    registerDevice();
  }, 1000);
  
  // Send periodic sensor data
  setInterval(() => {
    sendSensorData();
  }, 5000);
  
  // Send heartbeat
  setInterval(() => {
    sendHeartbeat();
  }, 30000);
});

// Device registration
function registerDevice() {
  const registrationData = {
    deviceId: DEVICE_CONFIG.deviceId,
    deviceType: DEVICE_CONFIG.deviceType,
    location: DEVICE_CONFIG.location,
    firmware: DEVICE_CONFIG.firmware,
    capabilities: DEVICE_CONFIG.capabilities,
    timestamp: new Date().toISOString(),
    status: 'online'
  };
  
  client.publish(IOT_TOPICS.DEVICE_REGISTER, JSON.stringify(registrationData), { qos: 1 });
  console.log(`📋 Device Registration Sent: ${JSON.stringify(registrationData, null, 2)}`);
  
  // Update device status
  client.publish(IOT_TOPICS.DEVICE_STATUS, JSON.stringify({
    deviceId: DEVICE_CONFIG.deviceId,
    status: 'online',
    timestamp: new Date().toISOString()
  }), { qos: 1, retain: true });
}

// Send sensor data
function sendSensorData() {
  const sensorData = {
    deviceId: DEVICE_CONFIG.deviceId,
    timestamp: new Date().toISOString(),
    sensors: {
      temperature: {
        value: (20 + Math.random() * 10).toFixed(2),
        unit: 'celsius',
        status: 'ok'
      },
      humidity: {
        value: (40 + Math.random() * 30).toFixed(2),
        unit: 'percent',
        status: 'ok'
      },
      light: {
        value: (100 + Math.random() * 400).toFixed(2),
        unit: 'lux',
        status: 'ok'
      }
    }
  };
  
  // Send to device-specific sensor data topic
  const sensorDataTopic = `${IOT_TOPICS.SENSOR_DATA}/${DEVICE_CONFIG.deviceId}`;
  client.publish(sensorDataTopic, JSON.stringify(sensorData), { qos: 1 });
  console.log(`🌡️  Sensor Data Sent to ${sensorDataTopic}: Temperature=${sensorData.sensors.temperature.value}°C, Humidity=${sensorData.sensors.humidity.value}%, Light=${sensorData.sensors.light.value}lux`);
}

// Send heartbeat
function sendHeartbeat() {
  const heartbeat = {
    deviceId: DEVICE_CONFIG.deviceId,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    status: 'alive'
  };
  
  client.publish(IOT_TOPICS.DEVICE_HEARTBEAT, JSON.stringify(heartbeat), { qos: 1 });
  console.log(`💓 Heartbeat Sent: Uptime=${heartbeat.uptime.toFixed(2)}s`);
}

// Handle incoming messages
client.on('message', function (topic, message) {
  console.log(`📨 Received message on topic "${topic}": ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    
    if (topic.includes('command')) {
      handleCommand(data);
    } else if (topic.includes('sensor/ctl')) {
      handleSensorControl(data, topic);
    } else if (topic === IOT_TOPICS.ACTUATOR_CONTROL) {
      handleActuatorControl(data);
    }
  } catch (e) {
    console.log(`📨 Raw message: ${message.toString()}`);
  }
});

// Handle sensor control commands
function handleSensorControl(control, topic) {
  console.log(`🔧 Sensor Control received on ${topic}: ${JSON.stringify(control, null, 2)}`);
  
  // Extract device ID from topic
  const deviceId = topic.split('/').pop();
  
  // Simulate sensor control response
  const response = {
    deviceId: DEVICE_CONFIG.deviceId,
    controlId: control.controlId || 'unknown',
    action: control.action || 'unknown',
    sensor: control.sensor || 'all',
    status: 'executed',
    result: 'success',
    timestamp: new Date().toISOString()
  };
  
  // Send response back to broker
  const responseTopic = `${IOT_TOPICS.SENSOR_DATA}/${DEVICE_CONFIG.deviceId}/response`;
  client.publish(responseTopic, JSON.stringify(response), { qos: 1 });
  console.log(`📤 Sensor Control Response Sent to ${responseTopic}: ${JSON.stringify(response, null, 2)}`);
  
  // Handle specific control actions
  if (control.action === 'calibrate') {
    console.log(`🔧 Calibrating sensor: ${control.sensor || 'all'}`);
  } else if (control.action === 'reset') {
    console.log(`🔄 Resetting sensor: ${control.sensor || 'all'}`);
  } else if (control.action === 'configure') {
    console.log(`⚙️  Configuring sensor: ${control.sensor || 'all'} with params:`, control.params);
  }
}

// Handle device commands
function handleCommand(command) {
  console.log(`⚙️  Processing Command: ${JSON.stringify(command, null, 2)}`);
  
  // Simulate command processing
  const response = {
    deviceId: DEVICE_CONFIG.deviceId,
    commandId: command.commandId || 'unknown',
    status: 'executed',
    result: 'success',
    timestamp: new Date().toISOString()
  };
  
  client.publish(IOT_TOPICS.DEVICE_RESPONSE, JSON.stringify(response), { qos: 1 });
  console.log(`📤 Command Response Sent: ${JSON.stringify(response, null, 2)}`);
}

// Handle actuator control
function handleActuatorControl(control) {
  console.log(`🔧 Actuator Control: ${JSON.stringify(control, null, 2)}`);
  
  // Simulate actuator response
  const response = {
    deviceId: DEVICE_CONFIG.deviceId,
    actuator: control.actuator,
    action: control.action,
    status: 'executed',
    timestamp: new Date().toISOString()
  };
  
  client.publish(IOT_TOPICS.DEVICE_RESPONSE, JSON.stringify(response), { qos: 1 });
  console.log(`📤 Actuator Response Sent: ${JSON.stringify(response, null, 2)}`);
}

// Error handling
client.on('error', function (error) {
  console.error('❌ IoT Device Error:', error);
});

client.on('close', function () {
  console.log('🔌 IoT Device disconnected');
});

client.on('offline', function () {
  console.log('📴 IoT Device offline');
});

// Graceful shutdown
process.on('SIGINT', function () {
  console.log('\n🛑 Shutting down IoT device...');
  
  // Send offline status
  client.publish(IOT_TOPICS.DEVICE_STATUS, JSON.stringify({
    deviceId: DEVICE_CONFIG.deviceId,
    status: 'offline',
    timestamp: new Date().toISOString()
  }), { qos: 1, retain: true });
  
  client.end(() => {
    console.log('✅ IoT device stopped');
    process.exit(0);
  });
});

console.log('🚀 Starting IoT Device...');
console.log(`📱 Device ID: ${DEVICE_CONFIG.deviceId}`);
console.log(`🔗 Connecting to: mqtt://${mqttHost}:${config.mqttPort}`);
console.log(`📍 Location: ${DEVICE_CONFIG.location}`);
console.log(`🔧 Capabilities: ${DEVICE_CONFIG.capabilities.join(', ')}`);
