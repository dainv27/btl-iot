const mqtt = require('mqtt');
const config = require('./config');

const IOT_TOPICS = {
  DEVICE_REGISTER: 'iot/device/register',
  DEVICE_STATUS: 'iot/device/status',
  DEVICE_DATA: 'iot/device/data',
  DEVICE_COMMAND: 'iot/device/command',
  DEVICE_RESPONSE: 'iot/device/response',
  SENSOR_DATA: 'iot/sensor/data',
  SENSOR_CTL: 'iot/sensor/ctl',
  ACTUATOR_CONTROL: 'iot/actuator/control',
  DEVICE_HEARTBEAT: 'iot/device/heartbeat'
};

const DEVICE_CONFIG = {
  deviceId: 'iot-device-tunghv',
  deviceType: 'pir',
  location: 'office',
  firmware: '1.0.0',
  capabilities: ['motion_detection', 'pir']
};

const mqttHost = process.env.MQTT_HOST || config.mqttHost || 'localhost';
const mqttPort = parseInt(process.env.MQTT_PORT) || config.mqttPort || 1883;

const client = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
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

client.on('connect', function () {
  console.log(`[DEBUG] MQTT client connected`);
  console.log(`✅ PIR Device Connected: ${DEVICE_CONFIG.deviceId}`);
  console.log(`[DEBUG] Connected to broker at: mqtt://${mqttHost}:${mqttPort}`);
  
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
  
  setTimeout(() => {
    registerDevice();
  }, 1000);
  
  setInterval(() => {
    sendPirData();
  }, 5000);
  
  setInterval(() => {
    sendHeartbeat();
  }, 30000);
});

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
  
  client.publish(IOT_TOPICS.DEVICE_STATUS, JSON.stringify({
    deviceId: DEVICE_CONFIG.deviceId,
    status: 'online',
    timestamp: new Date().toISOString()
  }), { qos: 1, retain: true });
}

function sendPirData() {
  const actions = ['motion_start', 'motion_stop'];
  const action = Math.random() > 0.5 ? actions[0] : actions[1];
  const value = action === 'motion_start' ? 1 : 0;
  const state = action === 'motion_start' ? 'motion' : 'idle';
  
  const pirData = {
    deviceId: DEVICE_CONFIG.deviceId,
    ts: Date.now(),
    source: 'pir',
    action: action,
    target: 'pir',
    value: value,
    detail: {
      index: Math.floor(Math.random() * 8) + 1,
      state: state
    }
  };
  
  const sensorDataTopic = `${IOT_TOPICS.SENSOR_DATA}/${DEVICE_CONFIG.deviceId}`;
  client.publish(sensorDataTopic, JSON.stringify(pirData), { qos: 1 });
  console.log(`📡 PIR Data Sent to ${sensorDataTopic}: ${JSON.stringify(pirData, null, 2)}`);
}

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

client.on('message', function (topic, message) {
  console.log(`[DEBUG] Message received on topic: "${topic}"`);
  console.log(`[DEBUG] Message payload: ${message.toString()}`);
  
  const expectedSensorCtlTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  console.log(`[DEBUG] Expected sensor control topic: ${expectedSensorCtlTopic}`);
  
  console.log(`📨 Received message on topic "${topic}": ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    console.log(`[DEBUG] Parsed message data:`, JSON.stringify(data, null, 2));
    
    if (topic === expectedSensorCtlTopic) {
      console.log(`[DEBUG] Handling sensor control message for device ${DEVICE_CONFIG.deviceId}`);
      handleSensorControl(data, topic);
    } else if (topic.includes('command')) {
      console.log(`[DEBUG] Handling device command message`);
      handleCommand(data);
    } else if (topic.startsWith(`${IOT_TOPICS.SENSOR_CTL}/`)) {
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

function handleSensorControl(control, topic) {
  console.log(`[DEBUG] handleSensorControl called`);
  console.log(`[DEBUG] Topic: ${topic}`);
  console.log(`[DEBUG] Control data:`, JSON.stringify(control, null, 2));
  
  const expectedTopic = `${IOT_TOPICS.SENSOR_CTL}/${DEVICE_CONFIG.deviceId}`;
  if (topic !== expectedTopic) {
    console.warn(`[DEBUG] Topic mismatch! Expected: ${expectedTopic}, Got: ${topic}`);
  }
  
  const deviceId = topic.split('/').pop();
  if (deviceId !== DEVICE_CONFIG.deviceId) {
    console.warn(`[DEBUG] Device ID mismatch! Expected: ${DEVICE_CONFIG.deviceId}, Got: ${deviceId}`);
    return;
  }
  
  console.log(`🔧 Sensor Control received on ${topic}: ${JSON.stringify(control, null, 2)}`);
  
  const response = {
    deviceId: DEVICE_CONFIG.deviceId,
    controlId: control.controlId || `control-${Date.now()}`,
    action: control.action || 'unknown',
    sensor: control.sensor || 'pir',
    status: 'executed',
    result: 'success',
    timestamp: new Date().toISOString(),
    originalCommand: control
  };
  
  console.log(`[DEBUG] Preparing response:`, JSON.stringify(response, null, 2));
  
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
  
  if (control.action === 'calibrate') {
    console.log(`[DEBUG] Executing calibrate action for sensor: ${control.sensor || 'pir'}`);
    console.log(`🔧 Calibrating sensor: ${control.sensor || 'pir'}`);
  } else if (control.action === 'reset') {
    console.log(`[DEBUG] Executing reset action for sensor: ${control.sensor || 'pir'}`);
    console.log(`🔄 Resetting sensor: ${control.sensor || 'pir'}`);
  } else if (control.action === 'configure') {
    console.log(`[DEBUG] Executing configure action for sensor: ${control.sensor || 'pir'}`);
    console.log(`[DEBUG] Configuration params:`, control.params);
    console.log(`⚙️  Configuring sensor: ${control.sensor || 'pir'} with params:`, control.params);
  } else {
    console.log(`[DEBUG] Unknown action: ${control.action}, treating as generic command`);
  }
  
  console.log(`[DEBUG] Sensor control handling completed`);
}

function handleCommand(command) {
  console.log(`⚙️  Processing Command: ${JSON.stringify(command, null, 2)}`);
  
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

function handleActuatorControl(control) {
  console.log(`🔧 Actuator Control: ${JSON.stringify(control, null, 2)}`);
  
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

client.on('error', function (error) {
  console.error('❌ PIR Device Error:', error);
});

client.on('close', function () {
  console.log('🔌 PIR Device disconnected');
});

client.on('offline', function () {
  console.log('📴 PIR Device offline');
});

process.on('SIGINT', function () {
  console.log('\n🛑 Shutting down PIR device...');
  
  client.publish(IOT_TOPICS.DEVICE_STATUS, JSON.stringify({
    deviceId: DEVICE_CONFIG.deviceId,
    status: 'offline',
    timestamp: new Date().toISOString()
  }), { qos: 1, retain: true });
  
  client.end(() => {
    console.log('✅ PIR device stopped');
    process.exit(0);
  });
});

console.log('🚀 Starting PIR Device...');
console.log(`📱 Device ID: ${DEVICE_CONFIG.deviceId}`);
console.log(`🔗 Connecting to: mqtt://${mqttHost}:${mqttPort}`);
console.log(`📍 Location: ${DEVICE_CONFIG.location}`);
console.log(`🔧 Capabilities: ${DEVICE_CONFIG.capabilities.join(', ')}`);

