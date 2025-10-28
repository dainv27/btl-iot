# ESP32 IoT Sensor Project

Project ESP32 với chức năng kết nối WiFi, MQTT và gửi dữ liệu cảm biến.

## Tính năng

- ✅ Kết nối WiFi với SSID: `dainv_24`
- ✅ Kết nối MQTT tới server: `localhost:1883`
- ✅ Gửi dữ liệu JSON lên topic: `iot/sensor/data`
- ✅ Tạo fake data nhiệt độ và độ ẩm (không cần cảm biến thật)
- ✅ Gửi dữ liệu định kỳ mỗi 5 giây

## Cấu hình

### WiFi
- SSID: `dainv_24`
- Password: `vannhucu@`

### MQTT
- Server: `localhost`
- Port: `1883`
- Topic: `iot/sensor/data`

### Fake Data
- Nhiệt độ: 15-35°C (biến thiên ±5°C từ giá trị cơ bản 25°C)
- Độ ẩm: 30-90% (biến thiên ±20% từ giá trị cơ bản 60%)
- Dữ liệu được tạo ngẫu nhiên mỗi lần gửi

## Cài đặt và sử dụng

### Yêu cầu
- PlatformIO IDE hoặc Arduino IDE
- ESP32 development board
- Không cần cảm biến thật (sử dụng fake data)

### Kết nối phần cứng
```
Không cần kết nối cảm biến!
Chỉ cần ESP32 board và cáp USB để upload code.
```

### Cài đặt với PlatformIO

1. Mở terminal và chạy:
```bash
pio run --target upload
```

2. Mở Serial Monitor:
```bash
pio device monitor
```

### Cài đặt với Arduino IDE

1. Cài đặt các thư viện:
   - PubSubClient
   - ArduinoJson

2. Upload code lên ESP32

3. Mở Serial Monitor với baud rate 115200

## Định dạng dữ liệu JSON

Dữ liệu được gửi lên MQTT có định dạng:

```json
{
  "device_id": "ESP32_001",
  "timestamp": 1234567890,
  "temperature": 25.5,
  "humidity": 60.2,
  "location": "Room_1"
}
```

## Troubleshooting

### Không kết nối được WiFi
- Kiểm tra SSID và password
- Đảm bảo ESP32 trong phạm vi WiFi
- Kiểm tra Serial Monitor để xem thông báo lỗi

### Không kết nối được MQTT
- Kiểm tra IP và port của MQTT server
- Đảm bảo server MQTT đang hoạt động
- Kiểm tra firewall và network

### Không đọc được dữ liệu cảm biến
- Không cần cảm biến thật, dữ liệu được tạo fake
- Kiểm tra Serial Monitor để xem fake data được tạo

## Cấu trúc project

```
iot/
├── src/
│   └── main.cpp          # Code chính
├── platformio.ini       # Cấu hình PlatformIO
└── README.md            # Hướng dẫn này
```

## License

MIT License
