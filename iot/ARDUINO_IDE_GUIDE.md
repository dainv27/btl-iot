# Hướng dẫn sử dụng với Arduino IDE

## 📋 Cài đặt Arduino IDE

1. **Tải Arduino IDE**:
   - Truy cập: https://www.arduino.cc/en/software
   - Tải phiên bản mới nhất cho Windows
   - Cài đặt với các tùy chọn mặc định

2. **Cài đặt ESP32 Board Package**:
   - Mở Arduino IDE
   - Vào `File` → `Preferences`
   - Trong ô "Additional Board Manager URLs", thêm:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Nhấn `OK`

3. **Cài đặt ESP32 Board**:
   - Vào `Tools` → `Board` → `Boards Manager`
   - Tìm kiếm "esp32"
   - Cài đặt "ESP32 by Espressif Systems"
   - Đợi quá trình cài đặt hoàn tất

## 📚 Cài đặt thư viện

1. **PubSubClient**:
   - Vào `Tools` → `Manage Libraries`
   - Tìm kiếm "PubSubClient"
   - Cài đặt "PubSubClient by Nick O'Leary"

2. **ArduinoJson**:
   - Trong Library Manager
   - Tìm kiếm "ArduinoJson"
   - Cài đặt "ArduinoJson by Benoit Blanchon"

## ⚙️ Cấu hình Arduino IDE

1. **Chọn Board**:
   - `Tools` → `Board` → `ESP32 Arduino` → `ESP32 Dev Module`

2. **Cấu hình Upload**:
   - `Tools` → `Upload Speed` → `921600`
   - `Tools` → `CPU Frequency` → `240MHz (WiFi/BT)`
   - `Tools` → `Flash Frequency` → `80MHz`
   - `Tools` → `Flash Mode` → `QIO`
   - `Tools` → `Flash Size` → `4MB (32Mb)`
   - `Tools` → `Partition Scheme` → `Default 4MB with spiffs`

3. **Chọn Port**:
   - Kết nối ESP32 với máy tính qua USB
   - `Tools` → `Port` → Chọn `COM3` (hoặc port tương ứng)

## 🚀 Upload và chạy chương trình

1. **Mở file**:
   - Mở file `ESP32_IoT_Sensor.ino` trong Arduino IDE

2. **Compile**:
   - Nhấn nút `Verify` (dấu tích) để kiểm tra lỗi
   - Đợi quá trình compile hoàn tất

3. **Upload**:
   - Nhấn nút `Upload` (mũi tên phải)
   - Đợi quá trình upload hoàn tất
   - Nếu gặp lỗi, nhấn nút `BOOT` trên ESP32 trong khi upload

4. **Mở Serial Monitor**:
   - `Tools` → `Serial Monitor`
   - Chọn baud rate: `115200`
   - Xem log kết nối WiFi và MQTT

## 🔧 Troubleshooting

### Lỗi "Board not found"
- Kiểm tra ESP32 board package đã được cài đặt
- Restart Arduino IDE

### Lỗi "Port not found"
- Kiểm tra driver USB cho ESP32
- Thử port khác trong `Tools` → `Port`
- Cài đặt driver CP210x hoặc CH340

### Lỗi upload
- Nhấn và giữ nút `BOOT` trên ESP32 khi upload
- Giảm upload speed xuống `115200`
- Kiểm tra cáp USB

### Lỗi compile
- Kiểm tra các thư viện đã được cài đặt đúng
- Restart Arduino IDE
- Kiểm tra phiên bản Arduino IDE (khuyến nghị 1.8.19+)

## 📊 Kiểm tra hoạt động

Sau khi upload thành công, Serial Monitor sẽ hiển thị:

```
Connecting to dainv_24
........
WiFi connected
IP address: 
192.168.1.100
Attempting MQTT connection...connected
Publishing: {"device_id":"ESP32_001","timestamp":12345,"temperature":24.5,"humidity":62.3,"location":"Room_1"}
Fake Temperature: 24.5°C, Fake Humidity: 62.3%
```

## 🎯 Lưu ý quan trọng

- ✅ Đảm bảo WiFi `dainv_24` có thể truy cập
- ✅ Kiểm tra MQTT server `localhost:1883` hoạt động
- ✅ ESP32 sẽ gửi dữ liệu fake mỗi 5 giây
- ✅ Dữ liệu được gửi lên topic `iot/sensor/data`
