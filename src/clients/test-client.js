const mqtt = require('mqtt');
const config = require('../broker/config');

// Create MQTT client
const client = mqtt.connect(`mqtt://202corp.com:${config.mqttPort}`, {
  clientId: 'test-client-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  username: config.requireAuth ? 'admin' : undefined,
  password: config.requireAuth ? 'password123' : undefined,
  reconnectPeriod: 1000,
});

// Connection event handlers
client.on('connect', function () {
  console.log('✅ Connected to MQTT broker');
  
  // Subscribe to test topics
  client.subscribe('test/topic', function (err) {
    if (!err) {
      console.log('📡 Subscribed to test/topic');
    }
  });
  
  client.subscribe('sensor/temperature', function (err) {
    if (!err) {
      console.log('📡 Subscribed to sensor/temperature');
    }
  });
  
  // Publish test messages
  setTimeout(() => {
    client.publish('test/topic', 'Hello MQTT World!', { qos: 1 });
    console.log('📤 Published: Hello MQTT World! to test/topic');
  }, 1000);
  
  setTimeout(() => {
    client.publish('sensor/temperature', JSON.stringify({
      value: 23.5,
      unit: 'celsius',
      timestamp: new Date().toISOString()
    }), { qos: 1 });
    console.log('📤 Published: Temperature data to sensor/temperature');
  }, 2000);
  
  setTimeout(() => {
    client.publish('test/topic', 'Goodbye MQTT World!', { qos: 1 });
    console.log('📤 Published: Goodbye MQTT World! to test/topic');
  }, 3000);
});

client.on('message', function (topic, message) {
  console.log(`📨 Received message on topic "${topic}": ${message.toString()}`);
});

client.on('error', function (error) {
  console.error('❌ MQTT Client Error:', error);
});

client.on('close', function () {
  console.log('🔌 MQTT Client disconnected');
});

client.on('offline', function () {
  console.log('📴 MQTT Client offline');
});

// Graceful shutdown
process.on('SIGINT', function () {
  console.log('\n🛑 Disconnecting MQTT client...');
  client.end(() => {
    console.log('✅ MQTT client disconnected');
    process.exit(0);
  });
});

console.log('🚀 Starting MQTT test client...');
console.log(`🔗 Connecting to: mqtt://202corp.com:${config.mqttPort}`);
