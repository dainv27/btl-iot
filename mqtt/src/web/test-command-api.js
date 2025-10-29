#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testCommandAPI() {
  console.log('🧪 Testing Command API');
  console.log('=====================');
  
  try {
    // Test status endpoint first
    console.log('\n📊 Checking API status...');
    const statusResponse = await axios.get(`${API_BASE}/status`);
    console.log('✅ API Status:', {
      server: statusResponse.data.server.status,
      redis: statusResponse.data.redis.connected,
      mqtt: statusResponse.data.mqtt.connected
    });
    
    if (!statusResponse.data.mqtt.connected) {
      console.log('❌ MQTT broker not connected. Please start the broker first.');
      return;
    }
    
    // Get devices
    console.log('\n📱 Getting devices...');
    const devicesResponse = await axios.get(`${API_BASE}/devices`);
    const devices = devicesResponse.data.devices;
    
    if (devices.length === 0) {
      console.log('❌ No devices found. Please connect some IoT devices first.');
      return;
    }
    
    const testDevice = devices[0].deviceId;
    console.log(`✅ Found ${devices.length} devices. Using ${testDevice} for testing.`);
    
    // Test command sending
    console.log('\n📤 Testing command sending...');
    
    const testCommands = [
      {
        name: 'Device Restart Command',
        topic: 'iot/device/command',
        data: { action: 'restart', timestamp: new Date().toISOString() },
        qos: 0,
        retain: false
      },
      {
        name: 'Sensor Control Command',
        topic: 'iot/sensor/ctl',
        data: { sensor: 'temperature', enable: true, interval: 5000 },
        qos: 1,
        retain: false
      },
      {
        name: 'Actuator Control Command',
        topic: 'iot/actuator/control',
        data: { actuator: 'relay', state: 1, duration: 5000 },
        qos: 0,
        retain: true
      }
    ];
    
    for (const command of testCommands) {
      try {
        console.log(`\n🔧 Testing: ${command.name}`);
        console.log(`   Topic: ${command.topic}`);
        console.log(`   Data: ${JSON.stringify(command.data)}`);
        console.log(`   QoS: ${command.qos}, Retain: ${command.retain}`);
        
        const response = await axios.post(`${API_BASE}/devices/${testDevice}/command`, command);
        
        if (response.data.success) {
          console.log('   ✅ Command sent successfully!');
          console.log(`   📤 Response: ${JSON.stringify(response.data, null, 2)}`);
        } else {
          console.log('   ❌ Command failed:', response.data.error);
        }
        
        // Wait a bit between commands
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log('   ❌ Command error:', error.response?.data?.error || error.message);
      }
    }
    
    // Test invalid command
    console.log('\n🚫 Testing invalid command...');
    try {
      await axios.post(`${API_BASE}/devices/${testDevice}/command`, {
        // Missing topic
        data: { test: 'invalid' }
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid command properly rejected:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 Command API tests completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the web app Control tab');
    console.log('   2. Try sending commands through the UI');
    console.log('   3. Monitor logs to see sent commands');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the web server is running:');
      console.log('   cd web-server && npm install && npm start');
    }
  }
}

testCommandAPI();
