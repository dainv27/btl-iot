const WebSocket = require('ws');

console.log('🔌 Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:9091');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  console.log('📡 Listening for real-time data...\n');
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log(`📨 [${parsed.type.toUpperCase()}] ${new Date().toLocaleTimeString()}`);
    
    switch (parsed.type) {
      case 'devices':
        console.log(`   📱 Devices: ${parsed.data.length} devices`);
        parsed.data.forEach(device => {
          console.log(`      - ${device.deviceId} (${device.status}) - ${device.deviceType}`);
        });
        break;
        
      case 'logs':
        console.log(`   📝 Logs: ${parsed.data.length} log entries`);
        break;
        
      case 'topics':
        console.log(`   📡 Topics: ${parsed.data.length} active topics`);
        break;
        
      case 'log':
        console.log(`   📝 Log: [${parsed.data.level}] ${parsed.data.deviceId} - ${parsed.data.message}`);
        break;
        
      case 'sensor_data':
        console.log(`   🌡️  Sensor Data: ${parsed.data.deviceId}`);
        if (parsed.data.data && parsed.data.data.sensors) {
          Object.entries(parsed.data.data.sensors).forEach(([key, sensor]) => {
            console.log(`      - ${key}: ${sensor.value} ${sensor.unit}`);
          });
        }
        break;
        
      case 'client_connected':
        console.log(`   🔌 Client Connected: ${parsed.data.clientId}`);
        break;
        
      case 'client_disconnected':
        console.log(`   🔌 Client Disconnected: ${parsed.data.clientId}`);
        break;
        
      default:
        console.log(`   ❓ Unknown type: ${parsed.type}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});
