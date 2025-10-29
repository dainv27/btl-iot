# 📊 Device Chart Feature

Tính năng biểu đồ line chart để hiển thị dữ liệu từ thiết bị IoT trong tab "Devices".

## 🎯 Tính năng

### 📈 Biểu đồ Line Chart
- **Hiển thị dữ liệu cảm biến** theo thời gian thực
- **Mỗi thiết bị một biểu đồ** riêng biệt
- **Người dùng chọn thiết bị** để xem biểu đồ
- **Auto-refresh** theo interval cài đặt

### 🔢 Xử lý dữ liệu
- **Dữ liệu số**: Hiển thị trực quan với đơn vị đo
- **Dữ liệu boolean**: Hiển thị "Có/Không" thay vì true/false
- **Tên cảm biến**: Chuyển đổi sang tiếng Việt dễ hiểu
- **Màu sắc**: Phân biệt các loại cảm biến

### 📱 Giao diện thân thiện
- **Dropdown chọn thiết bị** với trạng thái online/offline
- **Hiển thị giá trị hiện tại** của từng cảm biến
- **Biểu đồ responsive** với tooltip thông tin
- **Loading states** và error handling

## 🚀 Cách sử dụng

### 1. Khởi động hệ thống
```bash
# Khởi động MQTT broker
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt
npm start

# Khởi động web server (terminal khác)
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt/src/web/web-server
node server.js

# Khởi động web app (terminal khác)
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt/src/web/web-app
npm start
```

### 2. Sử dụng biểu đồ
1. Mở web app tại `http://localhost:3000`
2. Chuyển đến tab **"Devices"**
3. Trong phần **"📊 Biểu đồ dữ liệu thiết bị"**:
   - Chọn thiết bị từ dropdown
   - Xem biểu đồ tự động cập nhật
   - Giá trị hiện tại hiển thị ở trên biểu đồ

### 3. Gửi dữ liệu test
```bash
# Sử dụng sample message sender
cd /Volumes/Data/git/github/dainv/btl-iot/mqtt/src/clients
node sample-message-sender.js temperatureHumiditySensor
```

## 📊 Các loại dữ liệu được hỗ trợ

### 🌡️ Cảm biến số
- **Nhiệt độ** (Temperature): °C
- **Độ ẩm** (Humidity): %
- **Ánh sáng** (Light): lux
- **Áp suất** (Pressure): hPa
- **Chất lượng không khí** (Air Quality): AQI

### 🔘 Cảm biến boolean
- **Chuyển động** (Motion): Có/Không
- **Cảm biến PIR** (PIR): Có/Không

## 🎨 Giao diện

### 📈 Biểu đồ
- **Trục X**: Thời gian (20 điểm dữ liệu gần nhất)
- **Trục Y**: Giá trị số (nhiệt độ, độ ẩm, ánh sáng...)
- **Trục Y phải**: Trạng thái boolean (0/1 → Không/Có)
- **Màu sắc**: Mỗi cảm biến có màu riêng
- **Tooltip**: Hiển thị giá trị chi tiết khi hover

### 📊 Thống kê hiện tại
- **Cards hiển thị**: Giá trị hiện tại của từng cảm biến
- **Màu sắc**: 
  - Xanh lá: Giá trị bình thường
  - Đỏ: Cảnh báo/trạng thái "Có"
  - Xanh dương: Giá trị số

## 🔧 API Endpoints

### GET /api/sensor-data/:deviceId
Lấy dữ liệu cảm biến của thiết bị

**Parameters:**
- `deviceId`: ID của thiết bị
- `limit`: Số lượng điểm dữ liệu (default: 100)

**Response:**
```json
{
  "success": true,
  "deviceId": "iot-device-001",
  "data": [
    {
      "timestamp": "2024-01-01T10:00:00.000Z",
      "data": {
        "deviceId": "iot-device-001",
        "sensors": {
          "temperature": {
            "value": 25.5,
            "unit": "celsius"
          },
          "humidity": {
            "value": 60.2,
            "unit": "percent"
          }
        }
      }
    }
  ],
  "count": 20,
  "source": "redis"
}
```

## 📁 Files liên quan

### Frontend
- `src/components/DeviceChart.js` - Component biểu đồ chính
- `src/App.js` - Tích hợp DeviceChart vào tab Devices

### Backend
- `src/web/web-server/server.js` - API endpoint `/api/sensor-data/:deviceId`

### Dependencies
- `chart.js` - Thư viện biểu đồ
- `react-chartjs-2` - React wrapper cho Chart.js
- `antd` - UI components

## 🎯 Tính năng nâng cao

### 🔄 Auto-refresh
- Tự động cập nhật dữ liệu theo interval
- Sync với refresh interval của tab Devices
- Loading overlay khi đang cập nhật

### 📱 Responsive Design
- Biểu đồ tự động resize theo kích thước màn hình
- Cards thống kê responsive trên mobile
- Touch-friendly trên tablet

### 🎨 Customization
- Màu sắc có thể tùy chỉnh trong `DeviceChart.js`
- Số lượng điểm dữ liệu có thể điều chỉnh
- Tên cảm biến có thể thêm vào mapping

## 🐛 Troubleshooting

### Biểu đồ không hiển thị
1. Kiểm tra API server có chạy không (`http://localhost:3001/api/status`)
2. Kiểm tra có thiết bị nào được chọn không
3. Kiểm tra console browser có lỗi không

### Dữ liệu không cập nhật
1. Kiểm tra MQTT broker có chạy không
2. Kiểm tra Redis connection
3. Kiểm tra có dữ liệu sensor trong Redis không

### Performance issues
1. Giảm `limit` parameter trong API call
2. Tăng `refreshInterval` để giảm tần suất cập nhật
3. Kiểm tra số lượng thiết bị và dữ liệu

## 🚀 Future Enhancements

- [ ] **Multiple charts**: Hiển thị nhiều thiết bị cùng lúc
- [ ] **Chart types**: Bar chart, pie chart cho các loại dữ liệu khác
- [ ] **Export data**: Xuất dữ liệu ra CSV/Excel
- [ ] **Alerts**: Hiển thị cảnh báo trên biểu đồ
- [ ] **Zoom/Pan**: Phóng to/thu nhỏ biểu đồ
- [ ] **Real-time streaming**: WebSocket cho dữ liệu real-time
- [ ] **Custom time range**: Chọn khoảng thời gian hiển thị
- [ ] **Chart templates**: Templates cho các loại thiết bị khác nhau
