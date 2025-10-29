# 📱 IoT MQTT Sample Messages

Bộ sưu tập các sample message cho dự án IoT MQTT Broker, bao gồm các loại message phổ biến cho thiết bị IoT, cảm biến, và hệ thống điều khiển.

## 📁 Files

- **`SAMPLE_MESSAGES.md`** - Tài liệu chi tiết về các sample message
- **`src/clients/sample-messages.js`** - JavaScript object chứa các sample message
- **`src/clients/sample-message-sender.js`** - Script để gửi sample messages

## 🚀 Cách sử dụng

### 1. Khởi động MQTT Broker
```bash
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt
npm start
```

### 2. Gửi sample messages

#### Gửi tất cả messages liên tục:
```bash
node src/clients/sample-message-sender.js
```

#### Gửi message cụ thể:
```bash
node src/clients/sample-message-sender.js deviceRegistration
node src/clients/sample-message-sender.js temperatureHumiditySensor
node src/clients/sample-message-sender.js ledControl
```

#### Xem danh sách messages có sẵn:
```bash
node src/clients/sample-message-sender.js help
```

### 3. Sử dụng trong code

```javascript
const { sampleMessages, messageGenerators } = require('./src/clients/sample-messages');

// Sử dụng message có sẵn
const deviceReg = sampleMessages.deviceRegistration;
console.log(deviceReg.topic); // iot/device/register
console.log(deviceReg.payload); // JSON string

// Tạo message động
const randomSensorData = messageGenerators.generateRandomSensorData('iot-device-001');
const heartbeat = messageGenerators.generateDeviceHeartbeat('iot-device-001');
const alert = messageGenerators.generateAlert('iot-device-001', 'temperature_high');
```

## 📋 Các loại Sample Messages

### 🔧 Device Management
- **Device Registration** - Đăng ký thiết bị mới
- **Device Status** - Cập nhật trạng thái thiết bị
- **Device Heartbeat** - Ping thiết bị định kỳ

### 🌡️ Sensor Data
- **Temperature & Humidity** - Dữ liệu nhiệt độ và độ ẩm
- **Multi-Sensor** - Dữ liệu từ nhiều cảm biến
- **Motion Sensor** - Cảm biến chuyển động

### ⚙️ Control Messages
- **Sensor Control** - Điều khiển cảm biến
- **Actuator Control** - Điều khiển thiết bị (LED, Fan, Relay)

### 🚨 Alert System
- **Temperature Alerts** - Cảnh báo nhiệt độ
- **Device Offline** - Cảnh báo thiết bị offline

### 📊 System Messages
- **System Status** - Trạng thái hệ thống
- **System Logs** - Log hệ thống

### 📱 Application Messages
- **Mobile App** - Messages cho mobile app
- **Web Dashboard** - Messages cho web dashboard

## 🎯 Topic Structure

```
iot/
├── device/
│   ├── register          # Đăng ký thiết bị
│   ├── status           # Trạng thái thiết bị
│   ├── heartbeat        # Ping thiết bị
│   ├── data/{deviceId}  # Dữ liệu thiết bị
│   ├── command/{deviceId} # Lệnh điều khiển
│   └── response/{deviceId} # Phản hồi từ thiết bị
├── sensor/
│   ├── data/{deviceId}   # Dữ liệu cảm biến
│   └── ctl/{deviceId}    # Điều khiển cảm biến
├── actuator/
│   └── control/{deviceId} # Điều khiển thiết bị
└── alerts/
    ├── temperature      # Cảnh báo nhiệt độ
    ├── humidity         # Cảnh báo độ ẩm
    └── device           # Cảnh báo thiết bị

system/
├── status              # Trạng thái hệ thống
└── log                 # Log hệ thống

mobile/app/
├── command             # Lệnh từ mobile app
└── response            # Phản hồi cho mobile app

web/dashboard/
├── request             # Yêu cầu từ dashboard
└── data                # Dữ liệu cho dashboard

test/
├── connection          # Test kết nối
└── sensor/data         # Test dữ liệu cảm biến
```

## 🔧 Message Generators

### Random Sensor Data
```javascript
const sensorData = messageGenerators.generateRandomSensorData('iot-device-001', 'room-1');
```

### Device Heartbeat
```javascript
const heartbeat = messageGenerators.generateDeviceHeartbeat('iot-device-001');
```

### Alert Messages
```javascript
const alert = messageGenerators.generateAlert('iot-device-001', 'temperature_high', 'critical');
```

## 📊 Message Format

### Required Fields
- `deviceId`: ID duy nhất của thiết bị
- `timestamp`: Thời gian ISO 8601
- `topic`: MQTT topic (tự động thêm bởi broker)

### Optional Fields
- `messageId`: ID duy nhất của message
- `correlationId`: Để theo dõi request-response
- `version`: Phiên bản format message
- `source`: Nguồn gốc message

## 🧪 Testing

### Test với MQTT Client
```bash
# Subscribe to all IoT topics
mosquitto_sub -h localhost -t "iot/#" -v

# Subscribe to specific topic
mosquitto_sub -h localhost -t "iot/sensor/data/+" -v

# Publish test message
mosquitto_pub -h localhost -t "test/connection" -m '{"testId":"test-001","message":"Hello MQTT!"}'
```

### Test với WebSocket
```javascript
const ws = new WebSocket('ws://localhost:9090');
ws.onopen = () => {
  // Send MQTT connect packet
};
```

## 🔍 Monitoring

### Redis Keys
```bash
# Xem tất cả keys
redis-cli KEYS "*"

# Xem devices
redis-cli HGETALL devices::iot

# Xem logs của device
redis-cli LRANGE log::devices:iot-device-001 0 10
```

### Broker Logs
Broker sẽ tự động log tất cả messages và lưu vào Redis với pattern:
- `devices::iot` - Thông tin thiết bị
- `log::devices:{deviceId}` - Logs của thiết bị
- `sensor_data:{deviceId}` - Dữ liệu cảm biến
- `alerts:{deviceId}` - Cảnh báo của thiết bị

## 📝 Best Practices

1. **Luôn include timestamp** trong mọi message
2. **Sử dụng naming convention** nhất quán
3. **Validate data** trước khi gửi
4. **Handle errors** một cách graceful
5. **Sử dụng QoS levels** phù hợp
6. **Implement message acknowledgment**
7. **Log important messages**
8. **Sử dụng compression** cho payload lớn

## 🚀 Quick Start

1. Khởi động broker: `npm start`
2. Chạy sample sender: `node src/clients/sample-message-sender.js`
3. Monitor logs trong console của broker
4. Kiểm tra Redis: `redis-cli HGETALL devices::iot`

## 📞 Support

Nếu có vấn đề hoặc cần thêm sample messages, hãy tạo issue hoặc liên hệ team phát triển.
