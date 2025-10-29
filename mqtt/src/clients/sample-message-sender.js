#!/usr/bin/env node

/**
 * MQTT Sample Message Sender
 * This script sends sample messages to the MQTT broker for testing
 */

const mqtt = require('mqtt');
const { sampleMessages, messageGenerators } = require('./sample-messages');

// MQTT Broker configuration
const BROKER_URL = 'mqtt://localhost:1883';
const WS_URL = 'ws://localhost:9090';

// Client options
const clientOptions = {
  clientId: 'sample-message-sender',
  clean: true,
  connectTimeout: 4000,
  username: 'admin',
  password: 'password123',
  reconnectPeriod: 1000,
};

class SampleMessageSender {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.messageInterval = null;
  }

  async connect() {
    try {
      console.log('🔗 Connecting to MQTT broker...');
      
      // Try MQTT first, then WebSocket
      try {
        this.client = mqtt.connect(BROKER_URL, clientOptions);
      } catch (error) {
        console.log('📡 MQTT failed, trying WebSocket...');
        this.client = mqtt.connect(WS_URL, clientOptions);
      }

      this.client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        this.isConnected = true;
        this.startSendingMessages();
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Disconnected from MQTT broker');
        this.isConnected = false;
      });

      this.client.on('offline', () => {
        console.log('📴 Client offline');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Connection failed:', error);
    }
  }

  startSendingMessages() {
    console.log('\n📤 Starting to send sample messages...');
    console.log('Press Ctrl+C to stop\n');

    let messageIndex = 0;
    const messageKeys = Object.keys(sampleMessages);
    
    // Send messages every 3 seconds
    this.messageInterval = setInterval(() => {
      if (!this.isConnected) {
        console.log('⚠️  Not connected, skipping message');
        return;
      }

      const messageKey = messageKeys[messageIndex % messageKeys.length];
      const message = sampleMessages[messageKey];
      
      this.sendMessage(message.topic, message.payload, messageKey);
      
      messageIndex++;
    }, 3000);

    // Send random sensor data every 5 seconds
    setInterval(() => {
      if (!this.isConnected) return;
      
      const deviceId = `iot-device-${Math.floor(Math.random() * 5) + 1}`;
      const randomSensorData = messageGenerators.generateRandomSensorData(deviceId);
      
      this.sendMessage(randomSensorData.topic, randomSensorData.payload, 'Random Sensor Data');
    }, 5000);

    // Send device heartbeat every 10 seconds
    setInterval(() => {
      if (!this.isConnected) return;
      
      const deviceId = `iot-device-${Math.floor(Math.random() * 5) + 1}`;
      const heartbeat = messageGenerators.generateDeviceHeartbeat(deviceId);
      
      this.sendMessage(heartbeat.topic, heartbeat.payload, 'Device Heartbeat');
    }, 10000);

    // Send random alerts every 15 seconds
    setInterval(() => {
      if (!this.isConnected) return;
      
      const deviceId = `iot-device-${Math.floor(Math.random() * 5) + 1}`;
      const alertTypes = ['temperature_high', 'temperature_low', 'humidity_high', 'humidity_low'];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const alert = messageGenerators.generateAlert(deviceId, alertType);
      
      this.sendMessage(alert.topic, alert.payload, `Alert: ${alertType}`);
    }, 15000);
  }

  sendMessage(topic, payload, messageType) {
    try {
      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error(`❌ Failed to send ${messageType}:`, error.message);
        } else {
          console.log(`📤 Sent ${messageType} to topic: ${topic}`);
          console.log(`   Payload: ${payload.substring(0, 100)}${payload.length > 100 ? '...' : ''}`);
          console.log('');
        }
      });
    } catch (error) {
      console.error(`❌ Error sending ${messageType}:`, error.message);
    }
  }

  sendSingleMessage(messageKey) {
    if (!this.isConnected) {
      console.log('❌ Not connected to broker');
      return;
    }

    const message = sampleMessages[messageKey];
    if (!message) {
      console.log(`❌ Message key '${messageKey}' not found`);
      console.log('Available messages:', Object.keys(sampleMessages));
      return;
    }

    this.sendMessage(message.topic, message.payload, messageKey);
  }

  disconnect() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
    
    if (this.client) {
      this.client.end();
    }
    
    console.log('\n👋 Disconnected from MQTT broker');
    process.exit(0);
  }
}

// Main execution
const sender = new SampleMessageSender();

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`
📋 MQTT Sample Message Sender

Usage:
  node sample-message-sender.js                    # Send all sample messages continuously
  node sample-message-sender.js <message-key>      # Send specific message once
  node sample-message-sender.js help               # Show this help

Available message keys:
${Object.keys(sampleMessages).map(key => `  - ${key}`).join('\n')}

Examples:
  node sample-message-sender.js deviceRegistration
  node sample-message-sender.js temperatureHumiditySensor
  node sample-message-sender.js ledControl
`);
    process.exit(0);
  }
  
  // Send specific message
  sender.connect().then(() => {
    setTimeout(() => {
      sender.sendSingleMessage(command);
      setTimeout(() => sender.disconnect(), 1000);
    }, 2000);
  });
} else {
  // Send all messages continuously
  sender.connect();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  sender.disconnect();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  sender.disconnect();
});
