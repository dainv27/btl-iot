const mqtt = require('mqtt');
const config = require('../broker/config');

console.log('🧪 Testing New Topic Format Implementation');
console.log('==========================================');

// Test device ID
const testDeviceId = 'iot-device-test123';

// Create test client
const testClient = mqtt.connect(`mqtt://14.224.166.195:${config.mqttPort}`, {
  clientId: 'topic-test-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000
});

testClient.on('connect', function () {
  console.log('✅ Test Client Connected');
  
  // Subscribe to all relevant topics
  const topics = [
    `iot/sensor/data/${testDeviceId}`,
    `iot/sensor/ctl/${testDeviceId}`,
    `iot/sensor/data/${testDeviceId}/response`
  ];
  
  topics.forEach(topic => {
    testClient.subscribe(topic, function (err) {
      if (!err) {
        console.log(`📡 Subscribed to: ${topic}`);
      }
    });
  });
  
  // Test 1: Send sensor data to device-specific topic
  setTimeout(() => {
    console.log('\n🧪 Test 1: Sending sensor data to device-specific topic');
    const sensorData = {
      deviceId: testDeviceId,
      timestamp: new Date().toISOString(),
      sensors: {
        temperature: { value: '25.5', unit: 'celsius', status: 'ok' },
        humidity: { value: '60.2', unit: 'percent', status: 'ok' }
      }
    };
    
    const topic = `iot/sensor/data/${testDeviceId}`;
    testClient.publish(topic, JSON.stringify(sensorData), { qos: 1 });
    console.log(`📤 Published to ${topic}:`, JSON.stringify(sensorData, null, 2));
  }, 2000);
  
  // Test 2: Send sensor control command
  setTimeout(() => {
    console.log('\n🧪 Test 2: Sending sensor control command');
    const controlCommand = {
      controlId: 'test-cmd-001',
      action: 'calibrate',
      sensor: 'temperature',
      timestamp: new Date().toISOString()
    };
    
    const topic = `iot/sensor/ctl/${testDeviceId}`;
    testClient.publish(topic, JSON.stringify(controlCommand), { qos: 1 });
    console.log(`📤 Published to ${topic}:`, JSON.stringify(controlCommand, null, 2));
  }, 4000);
  
  // Test 3: Send sensor control response
  setTimeout(() => {
    console.log('\n🧪 Test 3: Sending sensor control response');
    const response = {
      deviceId: testDeviceId,
      controlId: 'test-cmd-001',
      action: 'calibrate',
      status: 'executed',
      result: 'success',
      timestamp: new Date().toISOString()
    };
    
    const topic = `iot/sensor/data/${testDeviceId}/response`;
    testClient.publish(topic, JSON.stringify(response), { qos: 1 });
    console.log(`📤 Published to ${topic}:`, JSON.stringify(response, null, 2));
  }, 6000);
  
  // End test after 8 seconds
  setTimeout(() => {
    console.log('\n✅ Test completed! Check broker logs for message handling.');
    testClient.end();
    process.exit(0);
  }, 8000);
});

testClient.on('message', function (topic, message) {
  console.log(`📨 Received on ${topic}: ${message.toString()}`);
});

testClient.on('error', function (error) {
  console.error('❌ Test Client Error:', error);
});

console.log(`🔗 Connecting to: mqtt://14.224.166.195:${config.mqttPort}`);
console.log(`📱 Test Device ID: ${testDeviceId}`);
console.log('⏰ Test will run for 8 seconds...\n');
