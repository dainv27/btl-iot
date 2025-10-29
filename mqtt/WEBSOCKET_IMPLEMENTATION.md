# 📡 WebSocket Real-time Implementation

Đã implement WebSocket để gửi log và device data real-time thay vì polling REST API.

## 🚀 **Tính năng WebSocket**

### 📡 **Real-time WebSocket Server**
- **Port**: 9091 (9090 + 1)
- **Protocol**: WebSocket
- **URL**: `ws://localhost:9091`

### 📊 **Dữ liệu real-time**
- **Devices**: Danh sách thiết bị và trạng thái
- **Logs**: Log messages từ thiết bị
- **Topics**: Danh sách topics MQTT
- **Sensor Data**: Dữ liệu cảm biến real-time
- **Client Events**: Kết nối/ngắt kết nối thiết bị

## 🔧 **Cấu trúc Message**

### **Device Data**
```json
{
  "type": "devices",
  "data": [
    {
      "deviceId": "iot-device-001",
      "status": "online",
      "deviceType": "sensor",
      "location": "room-1",
      "lastSeen": "2024-01-01T10:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### **Log Messages**
```json
{
  "type": "log",
  "data": {
    "deviceId": "iot-device-001",
    "level": "info",
    "message": "Sensor data published",
    "topic": "iot/sensor/data/iot-device-001",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "data": {
      "temperature": 25.5,
      "humidity": 60.2
    }
  }
}
```

### **Sensor Data**
```json
{
  "type": "sensor_data",
  "data": {
    "deviceId": "iot-device-001",
    "topic": "iot/sensor/data/iot-device-001",
    "timestamp": "2024-01-01T10:00:00.000Z",
    "data": {
      "temperature": { "value": 25.5, "unit": "celsius" },
      "humidity": { "value": 60.2, "unit": "percent" }
    }
  }
}
```

### **Client Events**
```json
{
  "type": "client_connected",
  "data": {
    "clientId": "iot-device-001",
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

## 🎯 **Frontend Implementation**

### **WebSocket Hook**
```javascript
// src/hooks/useWebSocket.js
const { isConnected, lastMessage, error } = useWebSocket('ws://localhost:9091');
```

### **WebSocket Context**
```javascript
// src/contexts/WebSocketContext.js
const { devices, logs, topics, sensorData, connectionStatus } = useRealtimeData();
```

### **App Integration**
```javascript
// src/App.js
const App = () => {
  return (
    <WebSocketProvider>
      <AppContent />
    </WebSocketProvider>
  );
};
```

## 🔄 **Auto-reconnection**

- **Max attempts**: 5 lần
- **Delay**: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Max delay**: 30 giây
- **Auto-reconnect**: Tự động kết nối lại khi mất kết nối

## 📱 **Notifications**

### **Device Events**
- **Connected**: Thông báo thiết bị kết nối
- **Disconnected**: Thông báo thiết bị ngắt kết nối

### **Log Levels**
- **Error**: Thông báo lỗi với màu đỏ
- **Warning**: Thông báo cảnh báo với màu vàng
- **Info**: Thông báo thông tin với màu xanh

## 🚀 **Cách sử dụng**

### 1. **Khởi động hệ thống**
```bash
# Khởi động MQTT broker (bao gồm WebSocket server)
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt
node src/broker/broker.js

# Khởi động web server
cd src/web/web-server
node server.js

# Khởi động web app
cd src/web/web-app
npm start
```

### 2. **Kiểm tra WebSocket**
- **Broker**: `ws://localhost:9091`
- **MQTT WebSocket**: `ws://localhost:9090`
- **Web App**: `http://localhost:3000`

### 3. **Test WebSocket**
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:9091');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
```

## 📊 **Performance Benefits**

### **Trước (Polling)**
- **API calls**: Mỗi 5 giây
- **Bandwidth**: Cao (repeated requests)
- **Latency**: 5 giây delay
- **Server load**: Cao

### **Sau (WebSocket)**
- **Real-time**: Instant updates
- **Bandwidth**: Thấp (push only)
- **Latency**: < 100ms
- **Server load**: Thấp

## 🔧 **Configuration**

### **Broker WebSocket**
```javascript
// src/broker/broker.js
const realtimeWsServer = new ws.Server({ port: config.wsPort + 1 }); // Port 9091
```

### **Frontend WebSocket**
```javascript
// src/contexts/WebSocketContext.js
const { isConnected, lastMessage, error } = useWebSocket('ws://localhost:9091');
```

## 🐛 **Troubleshooting**

### **WebSocket không kết nối**
1. Kiểm tra broker có chạy không
2. Kiểm tra port 9091 có bị block không
3. Kiểm tra firewall settings

### **Dữ liệu không cập nhật**
1. Kiểm tra WebSocket connection status
2. Kiểm tra console browser có lỗi không
3. Kiểm tra broker logs

### **Performance issues**
1. Kiểm tra số lượng WebSocket clients
2. Kiểm tra message frequency
3. Kiểm tra memory usage

## 🚀 **Future Enhancements**

- [ ] **WebSocket authentication**: JWT token authentication
- [ ] **Message compression**: Gzip compression cho messages
- [ ] **Rate limiting**: Giới hạn message frequency
- [ ] **Message queuing**: Queue messages khi client offline
- [ ] **Multiple rooms**: Separate channels cho different data types
- [ ] **WebSocket clustering**: Multiple WebSocket servers
- [ ] **Message persistence**: Store messages trong Redis
- [ ] **Client management**: Track connected clients
