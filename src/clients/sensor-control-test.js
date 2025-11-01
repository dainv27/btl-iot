const mqtt = require('mqtt');
const config = require('../broker/config');

// Test client to send sensor control commands
const testClient = mqtt.connect(`mqtt://202corp.com:${config.mqttPort}`, {
  clientId: 'sensor-control-test-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  username: config.requireAuth ? 'admin' : undefined,
  password: config.requireAuth ? 'password123' : undefined,
  reconnectPeriod: 1000
});

console.log('🚀 Starting Sensor Control Test Client...');
console.log(`🔗 Connecting to: mqtt://202corp.com:${config.mqttPort}`);

testClient.on('connect', function () {
  console.log('✅ Test Client Connected');
  
  // Test device ID (you can change this to match your actual device)
  const testDeviceId = 'iot-device-test123';
  
  // Send different types of sensor control commands
  setTimeout(() => {
    sendSensorControlCommand(testDeviceId, 'calibrate', 'temperature');
  }, 2000);
  
  setTimeout(() => {
    sendSensorControlCommand(testDeviceId, 'reset', 'all');
  }, 5000);
  
  setTimeout(() => {
    sendSensorControlCommand(testDeviceId, 'configure', 'humidity', {
      samplingRate: 1000,
      threshold: 50
    });
  }, 8000);
  
  setTimeout(() => {
    sendSensorControlCommand(testDeviceId, 'status', 'all');
  }, 11000);
  
  // Subscribe to responses
  testClient.subscribe(`iot/sensor/data/${testDeviceId}/response`, function (err) {
    if (!err) {
      console.log(`📡 Subscribed to sensor responses: iot/sensor/data/${testDeviceId}/response`);
    }
  });
});

testClient.on('message', function (topic, message) {
  console.log(`📨 Received response on topic "${topic}": ${message.toString()}`);
});

testClient.on('error', function (error) {
  console.error('❌ Test Client Error:', error);
});

function sendSensorControlCommand(deviceId, action, sensor, params = {}) {
  const controlCommand = {
    controlId: 'cmd-' + Date.now(),
    action: action,
    sensor: sensor,
    params: params,
    timestamp: new Date().toISOString()
  };
  
  const topic = `iot/sensor/ctl/${deviceId}`;
  testClient.publish(topic, JSON.stringify(controlCommand), { qos: 1 });
  console.log(`🔧 Sensor Control Sent to ${topic}: ${JSON.stringify(controlCommand, null, 2)}`);
}

// Graceful shutdown
process.on('SIGINT', function () {
  console.log('\n🛑 Shutting down test client...');
  testClient.end(() => {
    console.log('✅ Test client stopped');
    process.exit(0);
  });
});

// Keep the process running
setTimeout(() => {
  console.log('\n⏰ Test completed. Press Ctrl+C to exit.');
}, 15000);
