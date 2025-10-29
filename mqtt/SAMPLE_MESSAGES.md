# IoT MQTT Sample Messages

## 📱 Device Registration Messages

### Device Registration
**Topic:** `iot/device/register`
```json
{
  "deviceId": "iot-device-001",
  "deviceType": "sensor-node",
  "firmware": "v1.2.3",
  "capabilities": ["temperature", "humidity", "light"],
  "location": "room-1",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.100",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Device Status Update
**Topic:** `iot/device/status`
```json
{
  "deviceId": "iot-device-001",
  "status": "online",
  "batteryLevel": 85,
  "signalStrength": -45,
  "uptime": 3600,
  "lastRestart": "2024-01-01T09:00:00.000Z",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Device Heartbeat
**Topic:** `iot/device/heartbeat`
```json
{
  "deviceId": "iot-device-001",
  "status": "online",
  "uptime": 3600,
  "memory": {
    "free": 1024,
    "used": 2048,
    "total": 3072
  },
  "temperature": 45.2,
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🌡️ Sensor Data Messages

### Temperature & Humidity Sensor
**Topic:** `iot/sensor/data/iot-device-001`
```json
{
  "deviceId": "iot-device-001",
  "sensors": {
    "temperature": {
      "value": 25.5,
      "unit": "celsius",
      "accuracy": 0.1
    },
    "humidity": {
      "value": 60.2,
      "unit": "percent",
      "accuracy": 0.5
    }
  },
  "location": "room-1",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Multi-Sensor Data
**Topic:** `iot/sensor/data/iot-device-002`
```json
{
  "deviceId": "iot-device-002",
  "sensors": {
    "temperature": {
      "value": 22.8,
      "unit": "celsius"
    },
    "humidity": {
      "value": 45.3,
      "unit": "percent"
    },
    "light": {
      "value": 850,
      "unit": "lux"
    },
    "pressure": {
      "value": 1013.25,
      "unit": "hPa"
    },
    "airQuality": {
      "value": 45,
      "unit": "AQI",
      "level": "good"
    }
  },
  "location": "office-room",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Motion Sensor
**Topic:** `iot/sensor/data/motion-sensor-001`
```json
{
  "deviceId": "motion-sensor-001",
  "sensors": {
    "motion": {
      "detected": true,
      "confidence": 0.95
    },
    "pir": {
      "value": 1,
      "unit": "binary"
    }
  },
  "location": "entrance",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🔧 Sensor Control Messages

### Sensor Control Command
**Topic:** `iot/sensor/ctl/iot-device-001`
```json
{
  "command": "setSamplingRate",
  "deviceId": "iot-device-001",
  "parameters": {
    "interval": 30,
    "unit": "seconds"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Sensor Control Response
**Topic:** `iot/sensor/ctl/iot-device-001/response`
```json
{
  "deviceId": "iot-device-001",
  "command": "setSamplingRate",
  "status": "success",
  "message": "Sampling rate updated to 30 seconds",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## ⚙️ Actuator Control Messages

### LED Control
**Topic:** `iot/actuator/control/led-strip-001`
```json
{
  "deviceId": "led-strip-001",
  "action": "setColor",
  "parameters": {
    "color": "#FF0000",
    "brightness": 80,
    "effect": "solid"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Fan Control
**Topic:** `iot/actuator/control/fan-001`
```json
{
  "deviceId": "fan-001",
  "action": "setSpeed",
  "parameters": {
    "speed": 3,
    "mode": "auto"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Relay Control
**Topic:** `iot/actuator/control/relay-001`
```json
{
  "deviceId": "relay-001",
  "action": "toggle",
  "parameters": {
    "state": "on",
    "channel": 1
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🚨 Alert Messages

### Temperature Alert
**Topic:** `iot/alerts/temperature`
```json
{
  "deviceId": "iot-device-001",
  "alertType": "temperature_high",
  "severity": "warning",
  "message": "Temperature exceeds threshold",
  "value": 35.5,
  "threshold": 30.0,
  "location": "room-1",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Device Offline Alert
**Topic:** `iot/alerts/device`
```json
{
  "deviceId": "iot-device-002",
  "alertType": "device_offline",
  "severity": "critical",
  "message": "Device has been offline for 5 minutes",
  "lastSeen": "2024-01-01T09:55:00.000Z",
  "location": "office-room",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 📊 System Messages

### System Status
**Topic:** `system/status`
```json
{
  "brokerId": "mqtt-broker-001",
  "status": "running",
  "uptime": 86400,
  "connectedClients": 15,
  "totalMessages": 12500,
  "memoryUsage": {
    "used": 256,
    "total": 512,
    "unit": "MB"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### System Log
**Topic:** `system/log`
```json
{
  "level": "info",
  "message": "New device connected",
  "data": {
    "deviceId": "iot-device-003",
    "clientId": "iot-device-003",
    "ipAddress": "192.168.1.103"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🔄 Device Data Messages

### General Device Data
**Topic:** `iot/device/data/iot-device-001`
```json
{
  "deviceId": "iot-device-001",
  "data": {
    "sensorReadings": {
      "temperature": 25.5,
      "humidity": 60.2,
      "light": 850
    },
    "status": {
      "battery": 85,
      "signal": -45,
      "uptime": 3600
    },
    "configuration": {
      "samplingRate": 30,
      "reportInterval": 60
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Device Response
**Topic:** `iot/device/response/iot-device-001`
```json
{
  "deviceId": "iot-device-001",
  "requestId": "req-12345",
  "status": "success",
  "data": {
    "configuration": {
      "samplingRate": 30,
      "reportInterval": 60
    }
  },
  "message": "Configuration updated successfully",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 📱 Mobile App Messages

### Mobile App Command
**Topic:** `mobile/app/command`
```json
{
  "appId": "iot-mobile-app",
  "userId": "user-123",
  "command": "getDeviceStatus",
  "parameters": {
    "deviceId": "iot-device-001"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Mobile App Response
**Topic:** `mobile/app/response`
```json
{
  "appId": "iot-mobile-app",
  "userId": "user-123",
  "requestId": "req-mobile-123",
  "status": "success",
  "data": {
    "deviceId": "iot-device-001",
    "status": "online",
    "lastSeen": "2024-01-01T10:00:00.000Z",
    "sensors": {
      "temperature": 25.5,
      "humidity": 60.2
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🌐 Web Dashboard Messages

### Dashboard Request
**Topic:** `web/dashboard/request`
```json
{
  "dashboardId": "main-dashboard",
  "requestType": "getAllDevices",
  "filters": {
    "status": "online",
    "location": "room-1"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Dashboard Data
**Topic:** `web/dashboard/data`
```json
{
  "dashboardId": "main-dashboard",
  "data": {
    "devices": [
      {
        "deviceId": "iot-device-001",
        "status": "online",
        "location": "room-1",
        "lastSeen": "2024-01-01T10:00:00.000Z",
        "sensors": ["temperature", "humidity"]
      }
    ],
    "statistics": {
      "totalDevices": 5,
      "onlineDevices": 4,
      "offlineDevices": 1
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 🧪 Test Messages

### Test Connection
**Topic:** `test/connection`
```json
{
  "testId": "test-001",
  "message": "Hello MQTT Broker!",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### Test Sensor Data
**Topic:** `test/sensor/data`
```json
{
  "deviceId": "test-device-001",
  "sensors": {
    "temperature": {
      "value": 20.0,
      "unit": "celsius"
    },
    "humidity": {
      "value": 50.0,
      "unit": "percent"
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

## 📋 Message Format Guidelines

### Required Fields
- `deviceId`: Unique identifier for the device
- `timestamp`: ISO 8601 timestamp
- `topic`: MQTT topic (automatically added by broker)

### Optional Fields
- `messageId`: Unique message identifier
- `correlationId`: For request-response patterns
- `version`: Message format version
- `source`: Source application/device

### Data Types
- Numbers: Use appropriate precision (e.g., 25.5 for temperature)
- Strings: Use descriptive names
- Booleans: Use true/false
- Arrays: Use for multiple values
- Objects: Use for complex data structures

### Best Practices
1. Always include timestamp
2. Use consistent naming conventions
3. Validate data before sending
4. Handle errors gracefully
5. Use appropriate QoS levels
6. Implement message acknowledgment
7. Log important messages
8. Use compression for large payloads
