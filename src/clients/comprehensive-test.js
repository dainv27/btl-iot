const mqtt = require('mqtt');
const config = require('../broker/config');

console.log('🚀 IoT Device + Control System Test');
console.log('===================================');

// Device configuration
const DEVICE_CONFIG = {
  deviceId: 'iot-device-' + Math.random().toString(16).substr(2, 8),
  deviceType: 'sensor',
  location: 'test-lab',
  firmware: '2.0.0',
  capabilities: ['temperature', 'humidity', 'light']
};

// Create IoT device client
const deviceClient = mqtt.connect(`mqtt://202corp.com:${config.mqttPort}`, {
  clientId: DEVICE_CONFIG.deviceId,
  clean: true,
  connectTimeout: 4000
});

// Create control system client
const controlClient = mqtt.connect(`mqtt://202corp.com:${config.mqttPort}`, {
  clientId: 'control-system-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000
});

console.log(`📱 Device ID: ${DEVICE_CONFIG.deviceId}`);
console.log(`🔗 Connecting to: mqtt://202corp.com:${config.mqttPort}`);

// IoT Device Client
deviceClient.on('connect', function () {
  console.log(`✅ IoT Device Connected: ${DEVICE_CONFIG.deviceId}`);
  
  // Subscribe to sensor control topic for this device
  const sensorControlTopic = `iot/sensor/ctl/${DEVICE_CONFIG.deviceId}`;
  deviceClient.subscribe(sensorControlTopic, function (err) {
    if (!err) {
      console.log(`📡 Device subscribed to sensor control: ${sensorControlTopic}`);
    }
  });
  
  // Register device
  setTimeout(() => {
    registerDevice();
  }, 1000);
  
  // Send periodic sensor data
  setInterval(() => {
    sendSensorData();
  }, 3000);
});

// Control System Client
controlClient.on('connect', function () {
  console.log('✅ Control System Connected');
  
  // Subscribe to sensor data and responses
  controlClient.subscribe(`iot/sensor/data/${DEVICE_CONFIG.deviceId}`, function (err) {
    if (!err) {
      console.log(`📡 Control system subscribed to sensor data: iot/sensor/data/${DEVICE_CONFIG.deviceId}`);
    }
  });
  
  controlClient.subscribe(`iot/sensor/data/${DEVICE_CONFIG.deviceId}/response`, function (err) {
    if (!err) {
      console.log(`📡 Control system subscribed to responses: iot/sensor/data/${DEVICE_CONFIG.deviceId}/response`);
    }
  });
  
  // Send control commands periodically
  setTimeout(() => {
    sendControlCommand('calibrate', 'temperature');
  }, 5000);
  
  setTimeout(() => {
    sendControlCommand('configure', 'humidity', { samplingRate: 2000 });
  }, 10000);
  
  setTimeout(() => {
    sendControlCommand('status', 'all');
  }, 15000);
});

// Device functions
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
  
  deviceClient.publish('iot/device/register', JSON.stringify(registrationData), { qos: 1 });
  console.log(`📋 Device Registration Sent: ${JSON.stringify(registrationData, null, 2)}`);
}

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
  
  const sensorDataTopic = `iot/sensor/data/${DEVICE_CONFIG.deviceId}`;
  deviceClient.publish(sensorDataTopic, JSON.stringify(sensorData), { qos: 1 });
  console.log(`🌡️  Sensor Data Sent to ${sensorDataTopic}: T=${sensorData.sensors.temperature.value}°C, H=${sensorData.sensors.humidity.value}%, L=${sensorData.sensors.light.value}lux`);
}

// Control system functions
function sendControlCommand(action, sensor, params = {}) {
  const controlCommand = {
    controlId: 'cmd-' + Date.now(),
    action: action,
    sensor: sensor,
    params: params,
    timestamp: new Date().toISOString()
  };
  
  const topic = `iot/sensor/ctl/${DEVICE_CONFIG.deviceId}`;
  controlClient.publish(topic, JSON.stringify(controlCommand), { qos: 1 });
  console.log(`🔧 Control Command Sent to ${topic}: ${JSON.stringify(controlCommand, null, 2)}`);
}

// Device message handling
deviceClient.on('message', function (topic, message) {
  console.log(`📨 Device received on "${topic}": ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    
    if (topic.includes('sensor/ctl')) {
      handleSensorControl(data, topic);
    }
  } catch (e) {
    console.log(`📨 Raw message: ${message.toString()}`);
  }
});

// Control system message handling
controlClient.on('message', function (topic, message) {
  console.log(`📨 Control system received on "${topic}": ${message.toString()}`);
});

function handleSensorControl(control, topic) {
  console.log(`🔧 Device processing sensor control: ${JSON.stringify(control, null, 2)}`);
  
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
  
  const responseTopic = `iot/sensor/data/${DEVICE_CONFIG.deviceId}/response`;
  deviceClient.publish(responseTopic, JSON.stringify(response), { qos: 1 });
  console.log(`📤 Sensor Control Response Sent to ${responseTopic}: ${JSON.stringify(response, null, 2)}`);
}

// Error handling
deviceClient.on('error', function (error) {
  console.error('❌ Device Error:', error);
});

controlClient.on('error', function (error) {
  console.error('❌ Control System Error:', error);
});

// Graceful shutdown
process.on('SIGINT', function () {
  console.log('\n🛑 Shutting down test...');
  
  deviceClient.end(() => {
    controlClient.end(() => {
      console.log('✅ Test stopped');
      process.exit(0);
    });
  });
});

console.log('⏰ Test will run for 20 seconds. Press Ctrl+C to stop early.\n');

// Auto-stop after 20 seconds
setTimeout(() => {
  console.log('\n⏰ Test completed after 20 seconds');
  process.exit(0);
}, 20000);
