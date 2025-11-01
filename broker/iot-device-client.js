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
  console.log(`[DEBUG] MQTT client connected`);
  console.log(`✅ IoT Device Connected: ${DEVICE_CONFIG.deviceId}`);
  console.log(`[DEBUG] Connected to broker at: mqtt://${mqttHost}:${config.mqttPort}`);
  
  // Subscribe to device-specific topics
  const deviceCommandTopic = `iot/device/${DEVICE_CONFIG.deviceId}/command`;
  console.log(`[DEBUG] Subscribing to device command topic: ${deviceCommandTopic}`);
  client.subscribe(deviceCommandTopic, { qos: 1 }, function (err) {
    if (err) {
      console.error(`[DEBUG] Error subscribing to ${deviceCommandTopic}:`, err);
    } else {
      console.log(`📡 Subscribed to device commands: ${deviceCommandTopic}`);
      console.log(`[DEBUG] Subscription successful`);
    }
  });
  
  // Subscribe to sensor control topic for this specific device: iot/sensor/ctl/{deviceId}
  const sensorControlTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  console.log(`[DEBUG] Subscribing to sensor control topic: ${sensorControlTopic}`);
  client.subscribe(sensorControlTopic, { qos: 1 }, function (err) {
    if (err) {
      console.error(`[DEBUG] Error subscribing to ${sensorControlTopic}:`, err);
    } else {
      console.log(`📡 Subscribed to sensor control: ${sensorControlTopic}`);
      console.log(`[DEBUG] Subscription successful for topic: ${sensorControlTopic}`);
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
    temperature: parseFloat((20 + Math.random() * 10).toFixed(1)),
    humidity: Math.round(40 + Math.random() * 30),
    timestamp: Date.now()
  };
  
  // Send to device-specific sensor data topic
  const sensorDataTopic = `${IOT_TOPICS.SENSOR_DATA}/${DEVICE_CONFIG.deviceId}`;
  client.publish(sensorDataTopic, JSON.stringify(sensorData), { qos: 1 });
  console.log(`🌡️  Sensor Data Sent to ${sensorDataTopic}: Temperature=${sensorData.temperature}°C, Humidity=${sensorData.humidity}%, Timestamp=${sensorData.timestamp}`);
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
  console.log(`[DEBUG] Message received on topic: "${topic}"`);
  console.log(`[DEBUG] Message payload: ${message.toString()}`);
  console.log(`[DEBUG] Message length: ${message.length} bytes`);
  
  const expectedSensorCtlTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  console.log(`[DEBUG] Expected sensor control topic: ${expectedSensorCtlTopic}`);
  console.log(`[DEBUG] Topic matches sensor ctl format: ${topic === expectedSensorCtlTopic}`);
  
  console.log(`📨 Received message on topic "${topic}": ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    console.log(`[DEBUG] Parsed message data:`, JSON.stringify(data, null, 2));
    
    // Handle topic format: iot/sensor/ctl/{deviceId}
    if (topic === expectedSensorCtlTopic) {
      console.log(`[DEBUG] Handling sensor control message for device ${DEVICE_CONFIG.deviceId}`);
      handleSensorControl(data, topic);
    } else if (topic.includes('command')) {
      console.log(`[DEBUG] Handling device command message`);
      handleCommand(data);
    } else if (topic.startsWith(`${IOT_TOPICS.SENSOR_CTL}/`)) {
      // Handle other sensor control topics
      console.log(`[DEBUG] Handling generic sensor control message`);
      handleSensorControl(data, topic);
    } else if (topic === IOT_TOPICS.ACTUATOR_CONTROL) {
      console.log(`[DEBUG] Handling actuator control message`);
      handleActuatorControl(data);
    } else {
      console.log(`[DEBUG] Unknown topic format, no handler found`);
    }
  } catch (e) {
    console.error(`[DEBUG] Error parsing message:`, e);
    console.log(`📨 Raw message: ${message.toString()}`);
  }
});

// Handle sensor control commands
function handleSensorControl(control, topic) {
  console.log(`[DEBUG] handleSensorControl called`);
  console.log(`[DEBUG] Topic: ${topic}`);
  console.log(`[DEBUG] Control data:`, JSON.stringify(control, null, 2));
  console.log(`[DEBUG] Expected topic format: iot/sensor/ctl/${DEVICE_CONFIG.deviceId}`);
  
  // Validate topic format: iot/sensor/ctl/{deviceId}
  const expectedTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  if (topic !== expectedTopic) {
    console.warn(`[DEBUG] Topic mismatch! Expected: ${expectedTopic}, Got: ${topic}`);
  }
  
  // Extract device ID from topic
  const deviceId = topic.split('/').pop();
  console.log(`[DEBUG] Extracted device ID from topic: ${deviceId}`);
  console.log(`[DEBUG] Current device ID: ${DEVICE_CONFIG.deviceId}`);
  
  if (deviceId !== DEVICE_CONFIG.deviceId) {
    console.warn(`[DEBUG] Device ID mismatch! Expected: ${DEVICE_CONFIG.deviceId}, Got: ${deviceId}`);
    return;
  }
  
  console.log(`🔧 Sensor Control received on ${topic}: ${JSON.stringify(control, null, 2)}`);
  
  // Simulate sensor control response
  const response = {
    deviceId: DEVICE_CONFIG.deviceId,
    controlId: control.controlId || `control-${Date.now()}`,
    action: control.action || 'unknown',
    sensor: control.sensor || 'all',
    status: 'executed',
    result: 'success',
    timestamp: new Date().toISOString(),
    originalCommand: control
  };
  
  console.log(`[DEBUG] Preparing response:`, JSON.stringify(response, null, 2));
  
  // Send response back to broker
  const responseTopic = `${IOT_TOPICS.SENSOR_DATA}/${DEVICE_CONFIG.deviceId}/response`;
  console.log(`[DEBUG] Publishing response to topic: ${responseTopic}`);
  
  try {
    client.publish(responseTopic, JSON.stringify(response), { qos: 1 }, (err) => {
      if (err) {
        console.error(`[DEBUG] Error publishing response:`, err);
      } else {
        console.log(`[DEBUG] Response published successfully`);
      }
    });
    console.log(`📤 Sensor Control Response Sent to ${responseTopic}: ${JSON.stringify(response, null, 2)}`);
  } catch (error) {
    console.error(`[DEBUG] Error in publish:`, error);
  }
  
  // Handle specific control actions
  if (control.action === 'calibrate') {
    console.log(`[DEBUG] Executing calibrate action for sensor: ${control.sensor || 'all'}`);
    console.log(`🔧 Calibrating sensor: ${control.sensor || 'all'}`);
  } else if (control.action === 'reset') {
    console.log(`[DEBUG] Executing reset action for sensor: ${control.sensor || 'all'}`);
    console.log(`🔄 Resetting sensor: ${control.sensor || 'all'}`);
  } else if (control.action === 'configure') {
    console.log(`[DEBUG] Executing configure action for sensor: ${control.sensor || 'all'}`);
    console.log(`[DEBUG] Configuration params:`, control.params);
    console.log(`⚙️  Configuring sensor: ${control.sensor || 'all'} with params:`, control.params);
  } else {
    console.log(`[DEBUG] Unknown action: ${control.action}, treating as generic command`);
  }
  
  console.log(`[DEBUG] Sensor control handling completed`);
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
