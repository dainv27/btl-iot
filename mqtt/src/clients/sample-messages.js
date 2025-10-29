// IoT MQTT Sample Messages for Testing
// This file contains sample messages that can be used for testing the MQTT broker

const sampleMessages = {
  // Device Registration Messages
  deviceRegistration: {
    topic: 'iot/device/register',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      deviceType: 'sensor-node',
      firmware: 'v1.2.3',
      capabilities: ['temperature', 'humidity', 'light'],
      location: 'room-1',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      ipAddress: '192.168.1.100',
      timestamp: new Date().toISOString()
    })
  },

  deviceStatus: {
    topic: 'iot/device/status',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      status: 'online',
      batteryLevel: 85,
      signalStrength: -45,
      uptime: 3600,
      lastRestart: new Date(Date.now() - 3600000).toISOString(),
      timestamp: new Date().toISOString()
    })
  },

  deviceHeartbeat: {
    topic: 'iot/device/heartbeat',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      status: 'online',
      uptime: 3600,
      memory: {
        free: 1024,
        used: 2048,
        total: 3072
      },
      temperature: 45.2,
      timestamp: new Date().toISOString()
    })
  },

  // Sensor Data Messages
  temperatureHumiditySensor: {
    topic: 'iot/sensor/data/iot-device-001',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      sensors: {
        temperature: {
          value: 25.5,
          unit: 'celsius',
          accuracy: 0.1
        },
        humidity: {
          value: 60.2,
          unit: 'percent',
          accuracy: 0.5
        }
      },
      location: 'room-1',
      timestamp: new Date().toISOString()
    })
  },

  multiSensorData: {
    topic: 'iot/sensor/data/iot-device-002',
    payload: JSON.stringify({
      deviceId: 'iot-device-002',
      sensors: {
        temperature: {
          value: 22.8,
          unit: 'celsius'
        },
        humidity: {
          value: 45.3,
          unit: 'percent'
        },
        light: {
          value: 850,
          unit: 'lux'
        },
        pressure: {
          value: 1013.25,
          unit: 'hPa'
        },
        airQuality: {
          value: 45,
          unit: 'AQI',
          level: 'good'
        }
      },
      location: 'office-room',
      timestamp: new Date().toISOString()
    })
  },

  motionSensor: {
    topic: 'iot/sensor/data/motion-sensor-001',
    payload: JSON.stringify({
      deviceId: 'motion-sensor-001',
      sensors: {
        motion: {
          detected: true,
          confidence: 0.95
        },
        pir: {
          value: 1,
          unit: 'binary'
        }
      },
      location: 'entrance',
      timestamp: new Date().toISOString()
    })
  },

  // Sensor Control Messages
  sensorControlCommand: {
    topic: 'iot/sensor/ctl/iot-device-001',
    payload: JSON.stringify({
      command: 'setSamplingRate',
      deviceId: 'iot-device-001',
      parameters: {
        interval: 30,
        unit: 'seconds'
      },
      timestamp: new Date().toISOString()
    })
  },

  sensorControlResponse: {
    topic: 'iot/sensor/ctl/iot-device-001/response',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      command: 'setSamplingRate',
      status: 'success',
      message: 'Sampling rate updated to 30 seconds',
      timestamp: new Date().toISOString()
    })
  },

  // Actuator Control Messages
  ledControl: {
    topic: 'iot/actuator/control/led-strip-001',
    payload: JSON.stringify({
      deviceId: 'led-strip-001',
      action: 'setColor',
      parameters: {
        color: '#FF0000',
        brightness: 80,
        effect: 'solid'
      },
      timestamp: new Date().toISOString()
    })
  },

  fanControl: {
    topic: 'iot/actuator/control/fan-001',
    payload: JSON.stringify({
      deviceId: 'fan-001',
      action: 'setSpeed',
      parameters: {
        speed: 3,
        mode: 'auto'
      },
      timestamp: new Date().toISOString()
    })
  },

  relayControl: {
    topic: 'iot/actuator/control/relay-001',
    payload: JSON.stringify({
      deviceId: 'relay-001',
      action: 'toggle',
      parameters: {
        state: 'on',
        channel: 1
      },
      timestamp: new Date().toISOString()
    })
  },

  // Alert Messages
  temperatureAlert: {
    topic: 'iot/alerts/temperature',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      alertType: 'temperature_high',
      severity: 'warning',
      message: 'Temperature exceeds threshold',
      value: 35.5,
      threshold: 30.0,
      location: 'room-1',
      timestamp: new Date().toISOString()
    })
  },

  deviceOfflineAlert: {
    topic: 'iot/alerts/device',
    payload: JSON.stringify({
      deviceId: 'iot-device-002',
      alertType: 'device_offline',
      severity: 'critical',
      message: 'Device has been offline for 5 minutes',
      lastSeen: new Date(Date.now() - 300000).toISOString(),
      location: 'office-room',
      timestamp: new Date().toISOString()
    })
  },

  // System Messages
  systemStatus: {
    topic: 'system/status',
    payload: JSON.stringify({
      brokerId: 'mqtt-broker-001',
      status: 'running',
      uptime: 86400,
      connectedClients: 15,
      totalMessages: 12500,
      memoryUsage: {
        used: 256,
        total: 512,
        unit: 'MB'
      },
      timestamp: new Date().toISOString()
    })
  },

  systemLog: {
    topic: 'system/log',
    payload: JSON.stringify({
      level: 'info',
      message: 'New device connected',
      data: {
        deviceId: 'iot-device-003',
        clientId: 'iot-device-003',
        ipAddress: '192.168.1.103'
      },
      timestamp: new Date().toISOString()
    })
  },

  // Device Data Messages
  generalDeviceData: {
    topic: 'iot/device/data/iot-device-001',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      data: {
        sensorReadings: {
          temperature: 25.5,
          humidity: 60.2,
          light: 850
        },
        status: {
          battery: 85,
          signal: -45,
          uptime: 3600
        },
        configuration: {
          samplingRate: 30,
          reportInterval: 60
        }
      },
      timestamp: new Date().toISOString()
    })
  },

  deviceResponse: {
    topic: 'iot/device/response/iot-device-001',
    payload: JSON.stringify({
      deviceId: 'iot-device-001',
      requestId: 'req-12345',
      status: 'success',
      data: {
        configuration: {
          samplingRate: 30,
          reportInterval: 60
        }
      },
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    })
  },

  // Mobile App Messages
  mobileAppCommand: {
    topic: 'mobile/app/command',
    payload: JSON.stringify({
      appId: 'iot-mobile-app',
      userId: 'user-123',
      command: 'getDeviceStatus',
      parameters: {
        deviceId: 'iot-device-001'
      },
      timestamp: new Date().toISOString()
    })
  },

  mobileAppResponse: {
    topic: 'mobile/app/response',
    payload: JSON.stringify({
      appId: 'iot-mobile-app',
      userId: 'user-123',
      requestId: 'req-mobile-123',
      status: 'success',
      data: {
        deviceId: 'iot-device-001',
        status: 'online',
        lastSeen: new Date().toISOString(),
        sensors: {
          temperature: 25.5,
          humidity: 60.2
        }
      },
      timestamp: new Date().toISOString()
    })
  },

  // Web Dashboard Messages
  dashboardRequest: {
    topic: 'web/dashboard/request',
    payload: JSON.stringify({
      dashboardId: 'main-dashboard',
      requestType: 'getAllDevices',
      filters: {
        status: 'online',
        location: 'room-1'
      },
      timestamp: new Date().toISOString()
    })
  },

  dashboardData: {
    topic: 'web/dashboard/data',
    payload: JSON.stringify({
      dashboardId: 'main-dashboard',
      data: {
        devices: [
          {
            deviceId: 'iot-device-001',
            status: 'online',
            location: 'room-1',
            lastSeen: new Date().toISOString(),
            sensors: ['temperature', 'humidity']
          }
        ],
        statistics: {
          totalDevices: 5,
          onlineDevices: 4,
          offlineDevices: 1
        }
      },
      timestamp: new Date().toISOString()
    })
  },

  // Test Messages
  testConnection: {
    topic: 'test/connection',
    payload: JSON.stringify({
      testId: 'test-001',
      message: 'Hello MQTT Broker!',
      timestamp: new Date().toISOString()
    })
  },

  testSensorData: {
    topic: 'test/sensor/data',
    payload: JSON.stringify({
      deviceId: 'test-device-001',
      sensors: {
        temperature: {
          value: 20.0 + Math.random() * 10,
          unit: 'celsius'
        },
        humidity: {
          value: 50.0 + Math.random() * 20,
          unit: 'percent'
        }
      },
      timestamp: new Date().toISOString()
    })
  }
};

// Helper functions for generating dynamic messages
const messageGenerators = {
  // Generate random sensor data
  generateRandomSensorData: (deviceId, location = 'room-1') => {
    return {
      topic: `iot/sensor/data/${deviceId}`,
      payload: JSON.stringify({
        deviceId: deviceId,
        sensors: {
          temperature: {
            value: (20 + Math.random() * 15).toFixed(1),
            unit: 'celsius'
          },
          humidity: {
            value: (40 + Math.random() * 30).toFixed(1),
            unit: 'percent'
          },
          light: {
            value: Math.floor(100 + Math.random() * 900),
            unit: 'lux'
          }
        },
        location: location,
        timestamp: new Date().toISOString()
      })
    };
  },

  // Generate device heartbeat
  generateDeviceHeartbeat: (deviceId) => {
    return {
      topic: 'iot/device/heartbeat',
      payload: JSON.stringify({
        deviceId: deviceId,
        status: 'online',
        uptime: Math.floor(Math.random() * 86400),
        memory: {
          free: Math.floor(Math.random() * 2048),
          used: Math.floor(Math.random() * 1024),
          total: 3072
        },
        temperature: (40 + Math.random() * 10).toFixed(1),
        timestamp: new Date().toISOString()
      })
    };
  },

  // Generate alert message
  generateAlert: (deviceId, alertType, severity = 'warning') => {
    const alerts = {
      temperature_high: {
        message: 'Temperature exceeds threshold',
        value: 35.5,
        threshold: 30.0
      },
      temperature_low: {
        message: 'Temperature below threshold',
        value: 5.0,
        threshold: 10.0
      },
      humidity_high: {
        message: 'Humidity exceeds threshold',
        value: 85.0,
        threshold: 80.0
      },
      humidity_low: {
        message: 'Humidity below threshold',
        value: 15.0,
        threshold: 20.0
      },
      device_offline: {
        message: 'Device has been offline',
        lastSeen: new Date(Date.now() - 300000).toISOString()
      }
    };

    const alert = alerts[alertType] || alerts.temperature_high;
    
    return {
      topic: `iot/alerts/${alertType.split('_')[0]}`,
      payload: JSON.stringify({
        deviceId: deviceId,
        alertType: alertType,
        severity: severity,
        message: alert.message,
        ...alert,
        location: 'room-1',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sampleMessages,
    messageGenerators
  };
}

// Usage examples:
console.log('Sample Messages Available:');
console.log(Object.keys(sampleMessages));

console.log('\nMessage Generators Available:');
console.log(Object.keys(messageGenerators));

// Example usage:
// const randomSensorData = messageGenerators.generateRandomSensorData('iot-device-001', 'office');
// const heartbeat = messageGenerators.generateDeviceHeartbeat('iot-device-001');
// const alert = messageGenerators.generateAlert('iot-device-001', 'temperature_high', 'critical');
