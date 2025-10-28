// IoT Device Monitor Dashboard with Advanced Filtering
class IoTMonitor {
    constructor() {
        this.client = null;
        this.devices = new Map();
        this.dataHistory = [];
        this.alerts = [];
        this.maxDataItems = 100;
        this.filters = {
            topic: '',
            deviceId: '',
            dataType: ''
        };
        
        // Device data from Redis
        this.deviceDataFromRedis = new Map();
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectToMQTT();
        this.loadDeviceDataFromRedis();
    }
    
    initializeElements() {
        this.connectionStatus = document.getElementById('connectionStatus');
        this.deviceCount = document.getElementById('deviceCount');
        this.devicesList = document.getElementById('devicesList');
        this.dataStream = document.getElementById('dataStream');
        this.alertsList = document.getElementById('alertsList');
        this.clearDataBtn = document.getElementById('clearData');
        this.exportDataBtn = document.getElementById('exportData');
        
        // Filter elements
        this.topicFilter = document.getElementById('topicFilter');
        this.deviceFilter = document.getElementById('deviceFilter');
        this.dataTypeFilter = document.getElementById('dataTypeFilter');
        this.clearFiltersBtn = document.getElementById('clearFilters');
    }
    
    setupEventListeners() {
        this.clearDataBtn.addEventListener('click', () => this.clearData());
        this.exportDataBtn.addEventListener('click', () => this.exportData());
        this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        // Filter event listeners
        this.topicFilter.addEventListener('change', (e) => {
            this.filters.topic = e.target.value;
            this.applyFilters();
        });
        
        this.deviceFilter.addEventListener('change', (e) => {
            this.filters.deviceId = e.target.value;
            this.applyFilters();
        });
        
        this.dataTypeFilter.addEventListener('change', (e) => {
            this.filters.dataType = e.target.value;
            this.applyFilters();
        });
    }
    
    async loadDeviceDataFromRedis() {
        try {
            console.log('📡 Loading device data from Redis...');
            const response = await fetch('/api/devices');
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Loaded ${data.devices.length} devices from Redis`);
                data.devices.forEach(device => {
                    this.deviceDataFromRedis.set(device.deviceId, device);
                });
                this.updateDevicesList();
                this.updateDeviceFilter();
            } else {
                console.error('❌ Failed to load devices from Redis:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading device data from Redis:', error);
        }
    }
    
    connectToMQTT() {
        // Connect to MQTT broker via WebSocket
        const wsUrl = `ws://14.224.166.195:9090`;
        
        this.client = mqtt.connect(wsUrl, {
            clientId: 'iot-monitor-' + Math.random().toString(16).substr(2, 8),
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000
        });
        
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
            this.updateConnectionStatus(true);
            this.subscribeToTopics();
        });
        
        this.client.on('error', (error) => {
            console.error('MQTT connection error:', error);
            this.updateConnectionStatus(false);
        });
        
        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.updateConnectionStatus(false);
        });
        
        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });
    }
    
    subscribeToTopics() {
        const topics = [
            'iot/device/register',
            'iot/device/status',
            'iot/device/data',
            'iot/sensor/data',
            'iot/device/heartbeat',
            'iot/device/+/command',
            'iot/device/+/response',
            'iot/actuator/control'
        ];
        
        topics.forEach(topic => {
            this.client.subscribe(topic, (err) => {
                if (!err) {
                    console.log(`Subscribed to ${topic}`);
                }
            });
        });
    }
    
    handleMessage(topic, message) {
        console.log(`Received message on topic: ${topic}`, message.toString());
        
        try {
            const data = JSON.parse(message.toString());
            const timestamp = new Date().toISOString();
            
            console.log(`Parsed data:`, data);
            
            // Handle different message types
            switch (topic) {
                case 'iot/device/register':
                    console.log('Handling device registration:', data);
                    this.handleDeviceRegistration(data, timestamp);
                    break;
                case 'iot/device/status':
                    console.log('Handling device status:', data);
                    this.handleDeviceStatus(data, timestamp);
                    break;
                case 'iot/sensor/data':
                    console.log('Handling sensor data:', data);
                    this.handleSensorData(data, timestamp);
                    break;
                case 'iot/device/heartbeat':
                    console.log('Handling device heartbeat:', data);
                    this.handleDeviceHeartbeat(data, timestamp);
                    break;
                default:
                    console.log('Handling generic data:', topic, data);
                    this.handleGenericData(topic, data, timestamp);
            }
            
            // Add to data history
            this.addToDataHistory(topic, data, timestamp);
            
        } catch (e) {
            console.error('Error parsing message:', e);
            // Handle non-JSON messages
            this.addToDataHistory(topic, message.toString(), new Date().toISOString());
        }
    }
    
    handleDeviceRegistration(data, timestamp) {
        console.log('Device registration:', data);
        console.log('Current devices before registration:', this.devices.size);
        
        this.devices.set(data.deviceId, {
            ...data,
            registeredAt: timestamp,
            lastSeen: timestamp,
            status: 'online',
            messageCount: 0,
            lastSensorData: null,
            uptime: 0,
            memory: null
        });
        
        console.log('Current devices after registration:', this.devices.size);
        console.log('Device added:', this.devices.get(data.deviceId));
        
        this.updateDevicesList();
        this.updateDeviceCount();
        this.updateDeviceFilter();
    }
    
    handleDeviceStatus(data, timestamp) {
        if (this.devices.has(data.deviceId)) {
            const device = this.devices.get(data.deviceId);
            device.status = data.status;
            device.lastSeen = timestamp;
            this.devices.set(data.deviceId, device);
            this.updateDevicesList();
        }
    }
    
    handleSensorData(data, timestamp) {
        if (this.devices.has(data.deviceId)) {
            const device = this.devices.get(data.deviceId);
            device.messageCount++;
            device.lastSeen = timestamp;
            device.lastSensorData = data;
            this.devices.set(data.deviceId, device);
            this.updateDevicesList();
            
            // Check for alerts
            this.checkSensorAlerts(data, timestamp);
        }
    }
    
    handleDeviceHeartbeat(data, timestamp) {
        if (this.devices.has(data.deviceId)) {
            const device = this.devices.get(data.deviceId);
            device.lastSeen = timestamp;
            device.uptime = data.uptime;
            device.memory = data.memory;
            this.devices.set(data.deviceId, device);
            this.updateDevicesList();
        }
    }
    
    handleGenericData(topic, data, timestamp) {
        // Handle other IoT topics
        console.log(`Received data on ${topic}:`, data);
    }
    
    checkSensorAlerts(sensorData, timestamp) {
        const alerts = [];
        
        if (sensorData.sensors) {
            // Temperature alert
            if (sensorData.sensors.temperature) {
                const temp = parseFloat(sensorData.sensors.temperature.value);
                if (temp > 30) {
                    alerts.push({
                        type: 'temperature_high',
                        deviceId: sensorData.deviceId,
                        value: temp,
                        threshold: 30,
                        message: `High temperature alert: ${temp}°C`,
                        timestamp: timestamp
                    });
                }
            }
            
            // Humidity alert
            if (sensorData.sensors.humidity) {
                const humidity = parseFloat(sensorData.sensors.humidity.value);
                if (humidity > 80) {
                    alerts.push({
                        type: 'humidity_high',
                        deviceId: sensorData.deviceId,
                        value: humidity,
                        threshold: 80,
                        message: `High humidity alert: ${humidity}%`,
                        timestamp: timestamp
                    });
                }
            }
        }
        
        alerts.forEach(alert => {
            this.addAlert(alert);
        });
    }
    
    addAlert(alert) {
        this.alerts.unshift(alert);
        if (this.alerts.length > 50) {
            this.alerts.pop();
        }
        this.updateAlertsList();
    }
    
    addToDataHistory(topic, data, timestamp) {
        const dataItem = {
            topic,
            data,
            timestamp,
            id: Date.now() + Math.random(),
            deviceId: this.extractDeviceId(topic, data)
        };
        
        this.dataHistory.unshift(dataItem);
        if (this.dataHistory.length > this.maxDataItems) {
            this.dataHistory.pop();
        }
        this.updateDataStream();
    }
    
    extractDeviceId(topic, data) {
        // Try to extract device ID from topic or data
        if (data && data.deviceId) {
            return data.deviceId;
        }
        
        const topicParts = topic.split('/');
        if (topicParts.length >= 3 && topicParts[0] === 'iot') {
            return topicParts[2];
        }
        
        return 'unknown';
    }
    
    applyFilters() {
        this.updateDataStream();
        this.updateDevicesList();
    }
    
    clearFilters() {
        this.filters = { topic: '', deviceId: '', dataType: '' };
        this.topicFilter.value = '';
        this.deviceFilter.value = '';
        this.dataTypeFilter.value = '';
        this.applyFilters();
    }
    
    matchesFilters(dataItem) {
        // Topic filter
        if (this.filters.topic && !dataItem.topic.includes(this.filters.topic)) {
            return false;
        }
        
        // Device ID filter
        if (this.filters.deviceId && dataItem.deviceId !== this.filters.deviceId) {
            return false;
        }
        
        // Data type filter
        if (this.filters.dataType) {
            switch (this.filters.dataType) {
                case 'sensor':
                    if (!dataItem.topic.includes('sensor')) return false;
                    break;
                case 'status':
                    if (!dataItem.topic.includes('status')) return false;
                    break;
                case 'heartbeat':
                    if (!dataItem.topic.includes('heartbeat')) return false;
                    break;
                case 'command':
                    if (!dataItem.topic.includes('command')) return false;
                    break;
            }
        }
        
        return true;
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.textContent = 'Connected';
            this.connectionStatus.className = 'status-connected';
        } else {
            this.connectionStatus.textContent = 'Disconnected';
            this.connectionStatus.className = 'status-disconnected';
        }
    }
    
    updateDeviceCount() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        this.deviceCount.textContent = `${devicesToShow.size} devices`;
    }
    
    updateDeviceFilter() {
        const deviceFilter = this.deviceFilter;
        const currentValue = deviceFilter.value;
        
        // Use Redis data if available, otherwise use MQTT data
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        // Clear existing options except "All Devices"
        deviceFilter.innerHTML = '<option value="">All Devices</option>';
        
        // Add device options
        devicesToShow.forEach((device, deviceId) => {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = `${deviceId} (${device.deviceType || 'Unknown'})`;
            deviceFilter.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentValue && devicesToShow.has(currentValue)) {
            deviceFilter.value = currentValue;
        }
    }
    
    updateDevicesList() {
        console.log('Updating devices list. Current devices:', this.devices.size);
        console.log('Devices from Redis:', this.deviceDataFromRedis.size);
        console.log('Devices:', Array.from(this.devices.keys()));
        
        // Use Redis data if available, otherwise use MQTT data
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        if (devicesToShow.size === 0) {
            console.log('No devices, showing no-devices message');
            this.devicesList.innerHTML = '<div class="no-devices">No devices connected</div>';
            return;
        }
        
        const devicesHTML = Array.from(devicesToShow.values())
            .filter(device => {
                // Apply device filter
                if (this.filters.deviceId && device.deviceId !== this.filters.deviceId) {
                    return false;
                }
                return true;
            })
            .map(device => {
                const lastSeen = new Date(device.lastSeen).toLocaleString();
                const sensorInfo = device.lastSensorData ? 
                    Object.entries(device.lastSensorData.sensors || {})
                        .map(([key, sensor]) => `${key}: ${sensor.value}${sensor.unit ? sensor.unit : ''}`)
                        .join(', ') : 'No data';
                
                const memoryInfo = device.memory ? 
                    `Memory: ${(device.memory.heapUsed / 1024 / 1024).toFixed(2)}MB` : '';
                
                return `
                    <div class="device-item ${this.filters.deviceId === device.deviceId ? 'highlighted' : ''}">
                        <div class="device-header">
                            <span class="device-id">${device.deviceId}</span>
                            <span class="device-status status-${device.status}">${device.status}</span>
                        </div>
                        <div class="device-info">
                            <div><strong>Type:</strong> ${device.deviceType || 'Unknown'}</div>
                            <div><strong>Location:</strong> ${device.location || 'Unknown'}</div>
                            <div><strong>Messages:</strong> ${device.messageCount || 0}</div>
                            <div><strong>Last Seen:</strong> ${lastSeen}</div>
                            <div><strong>Firmware:</strong> ${device.firmware || 'Unknown'}</div>
                            <div><strong>Uptime:</strong> ${device.uptime ? device.uptime.toFixed(2) + 's' : 'Unknown'}</div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                            <strong>Latest Sensors:</strong> ${sensorInfo}
                        </div>
                        ${memoryInfo ? `<div style="margin-top: 5px; font-size: 0.85rem; color: #666;">${memoryInfo}</div>` : ''}
                    </div>
                `;
            }).join('');
        
        this.devicesList.innerHTML = devicesHTML;
    }
    
    updateDataStream() {
        if (this.dataHistory.length === 0) {
            this.dataStream.innerHTML = '<div class="no-data">Waiting for device data...</div>';
            return;
        }
        
        const filteredData = this.dataHistory.filter(item => this.matchesFilters(item));
        
        if (filteredData.length === 0) {
            this.dataStream.innerHTML = '<div class="no-data">No data matches current filters</div>';
            return;
        }
        
        const dataHTML = filteredData.map(item => {
            const timestamp = new Date(item.timestamp).toLocaleString();
            const dataStr = typeof item.data === 'object' ? 
                JSON.stringify(item.data, null, 2) : item.data;
            
            const isHighlighted = this.filters.deviceId === item.deviceId || 
                                 this.filters.topic && item.topic.includes(this.filters.topic);
            
            return `
                <div class="data-item ${isHighlighted ? 'highlighted' : ''}">
                    <div class="data-header">
                        <span class="data-topic">${item.topic}</span>
                        <span class="data-timestamp">${timestamp}</span>
                    </div>
                    <div class="data-content">
                        <div style="margin-bottom: 8px; font-size: 0.8rem; color: #666;">
                            <strong>Device:</strong> ${item.deviceId}
                        </div>
                        ${dataStr}
                    </div>
                </div>
            `;
        }).join('');
        
        this.dataStream.innerHTML = dataHTML;
    }
    
    updateAlertsList() {
        if (this.alerts.length === 0) {
            this.alertsList.innerHTML = '<div class="no-alerts">No alerts</div>';
            return;
        }
        
        const alertsHTML = this.alerts.map(alert => {
            const timestamp = new Date(alert.timestamp).toLocaleString();
            return `
                <div class="alert-item">
                    <div class="alert-header">
                        <span class="alert-type">${alert.type.replace('_', ' ').toUpperCase()}</span>
                        <span class="alert-timestamp">${timestamp}</span>
                    </div>
                    <div class="alert-message">
                        <strong>Device:</strong> ${alert.deviceId}<br>
                        ${alert.message}
                    </div>
                </div>
            `;
        }).join('');
        
        this.alertsList.innerHTML = alertsHTML;
    }
    
    clearData() {
        this.dataHistory = [];
        this.alerts = [];
        this.updateDataStream();
        this.updateAlertsList();
    }
    
    exportData() {
        const exportData = {
            devices: Array.from(this.devices.values()),
            dataHistory: this.dataHistory,
            alerts: this.alerts,
            filters: this.filters,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iot-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new IoTMonitor();
});