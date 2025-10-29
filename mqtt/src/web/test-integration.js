#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Web Server API Integration');
  console.log('=====================================');
  
  try {
    // Test status endpoint
    console.log('\n📊 Testing /api/status...');
    const statusResponse = await axios.get(`${API_BASE}/status`);
    console.log('✅ Status API:', {
      broker: statusResponse.data.broker.status,
      server: statusResponse.data.server.status,
      redis: statusResponse.data.redis
    });
    
    // Test devices endpoint
    console.log('\n📱 Testing /api/devices...');
    const devicesResponse = await axios.get(`${API_BASE}/devices`);
    console.log('✅ Devices API:', {
      count: devicesResponse.data.count,
      source: devicesResponse.data.source,
      devices: devicesResponse.data.devices.map(d => ({
        id: d.deviceId,
        type: d.deviceType,
        status: d.status,
        location: d.location
      }))
    });
    
    // Test logs endpoint
    console.log('\n📝 Testing /api/logs...');
    const logsResponse = await axios.get(`${API_BASE}/logs?limit=5`);
    console.log('✅ Logs API:', {
      count: logsResponse.data.count,
      source: logsResponse.data.source,
      logs: logsResponse.data.logs.map(l => ({
        level: l.level,
        deviceId: l.deviceId,
        message: l.message.substring(0, 50) + '...'
      }))
    });
    
    // Test topics endpoint
    console.log('\n📡 Testing /api/topics...');
    const topicsResponse = await axios.get(`${API_BASE}/topics`);
    console.log('✅ Topics API:', {
      count: topicsResponse.data.count,
      source: topicsResponse.data.source,
      topics: topicsResponse.data.topics.map(t => ({
        name: t.name,
        type: t.type,
        subscribers: t.subscribers
      }))
    });
    
    // Test health endpoint
    console.log('\n💚 Testing /api/health...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health API:', {
      status: healthResponse.data.status,
      uptime: Math.round(healthResponse.data.uptime),
      redis: healthResponse.data.redis
    });
    
    console.log('\n🎉 All API tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start MQTT broker: cd ../../broker && node broker.js');
    console.log('   2. Connect some IoT devices to see real data');
    console.log('   3. Check web app: cd web-app && npm start');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the web server is running:');
      console.log('   cd web-server && npm start');
    }
  }
}

testAPI();
