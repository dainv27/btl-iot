// Enhanced IoT Device Management Platform
class IoTManagementPlatform {
    constructor() {
        this.client = null;
        this.devices = new Map();
        this.dataHistory = [];
        this.alerts = [];
        this.logs = [];
        this.topics = new Map();
        this.maxDataItems = 100;
        this.filters = {
            topic: '',
            deviceId: '',
            dataType: ''
        };
        
        // Device data from Redis
        this.deviceDataFromRedis = new Map();
        
        this.initializeElements();
        this.initializeAntdComponents();
        this.setupEventListeners();
        this.connectToMQTT();
        this.loadDeviceDataFromRedis();
        this.loadTopics();
    }
    
    // Initialize Ant Design components
    initializeAntdComponents() {
        // Initialize message component for notifications
        this.message = antd.message;
        
        // Initialize notification component
        this.notification = antd.notification;
        
        // Initialize modal component
        this.modal = antd.modal;
        
        console.log('✅ Ant Design components initialized');
    }
    
    initializeElements() {
        // Connection status
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Device management elements
        this.devicesGrid = document.getElementById('devicesGrid');
        this.refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
        this.addDeviceBtn = document.getElementById('addDeviceBtn');
        this.deviceModal = document.getElementById('deviceModal');
        this.deviceModalTitle = document.getElementById('deviceModalTitle');
        this.deviceModalBody = document.getElementById('deviceModalBody');
        
        // Control elements
        this.controlDeviceSelect = document.getElementById('controlDeviceSelect');
        this.refreshControlBtn = document.getElementById('refreshControlBtn');
        this.turnOnBtn = document.getElementById('turnOnBtn');
        this.turnOffBtn = document.getElementById('turnOffBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.tempThreshold = document.getElementById('tempThreshold');
        this.humidityThreshold = document.getElementById('humidityThreshold');
        this.setTempBtn = document.getElementById('setTempBtn');
        this.setHumidityBtn = document.getElementById('setHumidityBtn');
        
        // Logs elements
        this.logsContainer = document.getElementById('logsContainer');
        this.logDeviceSelect = document.getElementById('logDeviceSelect');
        this.logLevelSelect = document.getElementById('logLevelSelect');
        this.logDateFrom = document.getElementById('logDateFrom');
        this.logDateTo = document.getElementById('logDateTo');
        this.refreshLogsBtn = document.getElementById('refreshLogsBtn');
        this.exportLogsBtn = document.getElementById('exportLogsBtn');
        this.applyLogFiltersBtn = document.getElementById('applyLogFiltersBtn');
        
        // Topics elements
        this.topicsGrid = document.getElementById('topicsGrid');
        this.refreshTopicsBtn = document.getElementById('refreshTopicsBtn');
        this.addTopicBtn = document.getElementById('addTopicBtn');
        this.topicModal = document.getElementById('topicModal');
        this.topicModalTitle = document.getElementById('topicModalTitle');
        this.topicModalBody = document.getElementById('topicModalBody');
        this.addTopicModal = document.getElementById('addTopicModal');
        this.addTopicForm = document.getElementById('addTopicForm');
    }
    
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Device management events
        if (this.refreshDevicesBtn) {
            this.refreshDevicesBtn.addEventListener('click', () => this.loadDeviceDataFromRedis());
        }
        if (this.addDeviceBtn) {
            this.addDeviceBtn.addEventListener('click', () => this.showAddDeviceModal());
        }
        
        // Control events
        if (this.refreshControlBtn) {
            this.refreshControlBtn.addEventListener('click', () => this.loadControlDevices());
        }
        if (this.controlDeviceSelect) {
            this.controlDeviceSelect.addEventListener('change', (e) => {
                this.selectedDevice = e.target.value;
                this.loadDeviceControlInterface(e.target.value);
            });
        }
        
        if (this.turnOnBtn) {
            this.turnOnBtn.addEventListener('click', () => this.sendDeviceCommand('turn_on'));
        }
        if (this.turnOffBtn) {
            this.turnOffBtn.addEventListener('click', () => this.sendDeviceCommand('turn_off'));
        }
        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => this.sendDeviceCommand('restart'));
        }
        
        if (this.setTempBtn) {
            this.setTempBtn.addEventListener('click', () => this.setSensorThreshold('temperature'));
        }
        if (this.setHumidityBtn) {
            this.setHumidityBtn.addEventListener('click', () => this.setSensorThreshold('humidity'));
        }
        
        // Logs events
        if (this.refreshLogsBtn) {
            this.refreshLogsBtn.addEventListener('click', () => this.loadLogs());
        }
        if (this.exportLogsBtn) {
            this.exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }
        if (this.applyLogFiltersBtn) {
            this.applyLogFiltersBtn.addEventListener('click', () => this.applyLogFilters());
        }
        
        // Topics events
        if (this.refreshTopicsBtn) {
            this.refreshTopicsBtn.addEventListener('click', () => this.loadTopics());
        }
        if (this.addTopicBtn) {
            this.addTopicBtn.addEventListener('click', () => this.showAddTopicModal());
        }
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Add topic form
        if (this.addTopicForm) {
            this.addTopicForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.subscribeToNewTopic();
            });
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }
    
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-panel').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedContent = document.getElementById(tabName);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
        
        // Add active class to selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Load data for specific tabs
        switch(tabName) {
            case 'devices':
                this.loadDeviceDataFromRedis();
                break;
            case 'control':
                this.loadControlDevices();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'topics':
                this.loadTopics();
                break;
        }
    }
    
    async loadDeviceDataFromRedis() {
        try {
            console.log('📡 Loading device data from Redis...');
            const response = await fetch('/api/devices');
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Loaded ${data.devices.length} devices from Redis`);
                this.deviceDataFromRedis.clear();
                data.devices.forEach(device => {
                    this.deviceDataFromRedis.set(device.deviceId, device);
                });
                this.updateDevicesList();
                this.updateDeviceFilter();
                this.updateDevicesGrid();
                this.updateControlDevices();
                this.updateLogDevices();
            } else {
                console.error('❌ Failed to load devices from Redis:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading device data from Redis:', error);
        }
    }
    
    updateDevicesGrid() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        if (devicesToShow.size === 0) {
            this.devicesGrid.innerHTML = '<div class="no-devices">No devices found</div>';
            return;
        }
        
        const devicesHTML = Array.from(devicesToShow.values()).map(device => {
            const lastSeen = new Date(device.lastSeen).toLocaleString();
            const sensorInfo = device.lastSensorData ? 
                Object.entries(device.lastSensorData.sensors || {})
                    .map(([key, sensor]) => `${key}: ${sensor.value}${sensor.unit ? sensor.unit : ''}`)
                    .join(', ') : 'No data';
            
            return `
                <div class="device-card" onclick="platform.showDeviceDetails('${device.deviceId}')">
                    <div class="device-card-header">
                        <div class="device-card-title">${device.deviceId}</div>
                        <span class="device-status status-${device.status}">${device.status}</span>
                    </div>
                    <div class="device-card-info">
                        <div><strong>Type:</strong> ${device.deviceType || 'Unknown'}</div>
                        <div><strong>Location:</strong> ${device.location || 'Unknown'}</div>
                        <div><strong>Messages:</strong> ${device.messageCount || 0}</div>
                        <div><strong>Last Seen:</strong> ${lastSeen}</div>
                    </div>
                    <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                        <strong>Latest Sensors:</strong> ${sensorInfo}
                    </div>
                    <div class="device-card-actions">
                        <button class="btn btn-primary" onclick="event.stopPropagation(); platform.showDeviceDetails('${device.deviceId}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); platform.controlDevice('${device.deviceId}')">
                            <i class="fas fa-gamepad"></i> Control
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.devicesGrid.innerHTML = devicesHTML;
    }
    
    showDeviceDetails(deviceId) {
        const device = this.deviceDataFromRedis.get(deviceId) || this.devices.get(deviceId);
        if (!device) return;
        
        this.modalTitle.textContent = `Device: ${deviceId}`;
        this.modalBody.innerHTML = `
            <div class="device-details">
                <div class="detail-section">
                    <h4>Basic Information</h4>
                    <div class="detail-grid">
                        <div><strong>Device ID:</strong> ${device.deviceId}</div>
                        <div><strong>Type:</strong> ${device.deviceType || 'Unknown'}</div>
                        <div><strong>Location:</strong> ${device.location || 'Unknown'}</div>
                        <div><strong>Firmware:</strong> ${device.firmware || 'Unknown'}</div>
                        <div><strong>Status:</strong> <span class="device-status status-${device.status}">${device.status}</span></div>
                        <div><strong>Registered:</strong> ${new Date(device.registeredAt).toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Performance Metrics</h4>
                    <div class="detail-grid">
                        <div><strong>Messages:</strong> ${device.messageCount || 0}</div>
                        <div><strong>Uptime:</strong> ${device.uptime ? device.uptime.toFixed(2) + 's' : 'Unknown'}</div>
                        <div><strong>Last Seen:</strong> ${new Date(device.lastSeen).toLocaleString()}</div>
                        <div><strong>Memory:</strong> ${device.memory ? (device.memory.heapUsed / 1024 / 1024).toFixed(2) + 'MB' : 'Unknown'}</div>
                    </div>
                </div>
                
                ${device.lastSensorData ? `
                <div class="detail-section">
                    <h4>Latest Sensor Data</h4>
                    <div class="sensor-data">
                        ${Object.entries(device.lastSensorData.sensors || {}).map(([key, sensor]) => `
                            <div class="sensor-item">
                                <strong>${key}:</strong> ${sensor.value}${sensor.unit ? sensor.unit : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        this.deviceModal.style.display = 'block';
    }
    
    controlDevice(deviceId) {
        this.switchTab('control');
        this.controlDeviceSelect.value = deviceId;
        this.loadDeviceControlInterface(deviceId);
    }
    
    loadControlDevices() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        this.controlDeviceSelect.innerHTML = '<option value="">Choose a device...</option>';
        devicesToShow.forEach((device, deviceId) => {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = `${deviceId} (${device.deviceType || 'Unknown'})`;
            this.controlDeviceSelect.appendChild(option);
        });
    }
    
    loadDeviceControlInterface(deviceId) {
        if (!deviceId) {
            this.controlInterface.innerHTML = `
                <div class="no-device-selected">
                    <i class="fas fa-hand-pointer"></i>
                    <p>Select a device to control it</p>
                </div>
            `;
            return;
        }
        
        const device = this.deviceDataFromRedis.get(deviceId) || this.devices.get(deviceId);
        if (!device) return;
        
        this.controlInterface.innerHTML = `
            <div class="control-widget">
                <h3><i class="fas fa-microchip"></i> ${deviceId} Control Panel</h3>
                <div class="sensor-control">
                    ${device.lastSensorData && device.lastSensorData.sensors ? 
                        Object.entries(device.lastSensorData.sensors).map(([key, sensor]) => `
                            <div class="sensor-item">
                                <h4>${key}</h4>
                                <div class="sensor-value">${sensor.value}</div>
                                <div class="sensor-unit">${sensor.unit || ''}</div>
                                <button class="btn btn-primary" onclick="platform.sendDeviceCommand('${deviceId}', '${key}', 'read')">
                                    <i class="fas fa-sync"></i> Refresh
                                </button>
                            </div>
                        `).join('') : 
                        '<div class="no-device-selected"><p>No sensor data available</p></div>'
                    }
                </div>
            </div>
            
            <div class="control-widget">
                <h3><i class="fas fa-cogs"></i> Device Commands</h3>
                <div class="command-controls">
                    <button class="btn btn-success" onclick="platform.sendDeviceCommand('${deviceId}', 'restart', '')">
                        <i class="fas fa-power-off"></i> Restart Device
                    </button>
                    <button class="btn btn-warning" onclick="platform.sendDeviceCommand('${deviceId}', 'status', '')">
                        <i class="fas fa-info-circle"></i> Get Status
                    </button>
                    <button class="btn btn-primary" onclick="platform.sendDeviceCommand('${deviceId}', 'config', '')">
                        <i class="fas fa-cog"></i> Get Config
                    </button>
                </div>
            </div>
        `;
    }
    
    sendDeviceCommand(deviceId, command, parameter) {
        const topic = `iot/device/${deviceId}/command`;
        const message = {
            command: command,
            parameter: parameter,
            timestamp: new Date().toISOString(),
            source: 'web-dashboard'
        };
        
        if (this.client && this.client.connected) {
            this.client.publish(topic, JSON.stringify(message));
            console.log(`📤 Sent command to ${deviceId}:`, message);
            
            // Add to data history
            this.addToDataHistory(topic, message, new Date().toISOString());
        } else {
            console.error('❌ MQTT client not connected');
            alert('MQTT client not connected. Please check connection.');
        }
    }
    
    async loadLogs() {
        try {
            const deviceId = this.logDeviceSelect.value;
            const level = this.logLevelSelect.value;
            const date = this.logDateRange.value;
            
            let url = '/api/logs';
            const params = new URLSearchParams();
            
            if (deviceId) params.append('deviceId', deviceId);
            if (level) params.append('level', level);
            if (date) params.append('date', date);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.logs = data.logs || [];
                this.updateLogsList();
            } else {
                console.error('❌ Failed to load logs:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading logs:', error);
        }
    }
    
    updateLogsList() {
        if (this.logs.length === 0) {
            this.logsList.innerHTML = '<div class="no-logs">No logs available</div>';
            return;
        }
        
        const logsHTML = this.logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            return `
                <div class="log-item ${log.level}">
                    <div class="log-header">
                        <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                        <span class="log-timestamp">${timestamp}</span>
                    </div>
                    <div class="log-message">${log.message}</div>
                    ${log.deviceId ? `<div style="font-size: 0.8rem; color: #666; margin-top: 5px;"><strong>Device:</strong> ${log.deviceId}</div>` : ''}
                </div>
            `;
        }).join('');
        
        this.logsList.innerHTML = logsHTML;
    }
    
    applyLogFilters() {
        this.loadLogs();
    }
    
    updateLogDevices() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        this.logDeviceSelect.innerHTML = '<option value="">All Devices</option>';
        devicesToShow.forEach((device, deviceId) => {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = `${deviceId} (${device.deviceType || 'Unknown'})`;
            this.logDeviceSelect.appendChild(option);
        });
    }
    
    async loadTopics() {
        try {
            // Load active topics (broker subscriptions) instead of static topics
            const response = await fetch('/api/topics/active');
            const data = await response.json();
            
            if (data.success) {
                this.topics.clear();
                data.topics.forEach(topic => {
                    this.topics.set(topic.name, {
                        name: topic.name,
                        type: topic.type,
                        subscribers: topic.subscribers,
                        messages: topic.messages,
                        lastMessage: topic.lastMessage
                    });
                });
                this.updateTopicsGrid();
            } else {
                console.error('❌ Failed to load active topics:', data.error);
                // Fallback to static topics if active topics fail
                this.loadStaticTopics();
            }
        } catch (error) {
            console.error('❌ Error loading active topics:', error);
            // Fallback to static topics
            this.loadStaticTopics();
        }
    }
    
    async loadStaticTopics() {
        try {
            const response = await fetch('/api/topics');
            const data = await response.json();
            
            if (data.success) {
                this.topics.clear();
                data.topics.forEach(topic => {
                    this.topics.set(topic, {
                        name: topic,
                        type: this.getTopicType(topic),
                        subscribers: 0,
                        messages: 0,
                        lastMessage: null
                    });
                });
                this.updateTopicsGrid();
            }
        } catch (error) {
            console.error('❌ Error loading static topics:', error);
        }
    }
    
    getTopicType(topic) {
        if (topic.includes('device')) return 'device';
        if (topic.includes('sensor')) return 'sensor';
        if (topic.includes('actuator')) return 'actuator';
        return 'general';
    }
    
    updateTopicsGrid() {
        if (this.topics.size === 0) {
            this.topicsGrid.innerHTML = '<div class="no-devices">No topics available</div>';
            return;
        }
        
        const topicsHTML = Array.from(this.topics.values()).map(topic => {
            return `
                <div class="topic-card" onclick="platform.showTopicDetails('${topic.name}')">
                    <div class="topic-card-header">
                        <div class="topic-name">${topic.name}</div>
                        <span class="topic-type ${topic.type}">${topic.type}</span>
                    </div>
                    <div class="topic-info">
                        <div><strong>Type:</strong> ${topic.type}</div>
                        <div><strong>Subscribers:</strong> ${topic.subscribers}</div>
                        <div><strong>Messages:</strong> ${topic.messages}</div>
                    </div>
                    <div class="topic-stats">
                        <span>Last message: ${topic.lastMessage ? new Date(topic.lastMessage).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.topicsGrid.innerHTML = topicsHTML;
    }
    
    async showTopicDetails(topicName) {
        const topic = this.topics.get(topicName);
        if (!topic) return;
        
        // Get subscriber information
        let subscribers = [];
        try {
            const response = await fetch(`/api/topics/${encodeURIComponent(topicName)}/subscribers`);
            const data = await response.json();
            if (data.success) {
                subscribers = data.subscribers;
            }
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        }
        
        this.topicModalTitle.textContent = `Topic: ${topicName}`;
        this.topicModalBody.innerHTML = `
            <div class="topic-details">
                <div class="detail-section">
                    <h4>Topic Information</h4>
                    <div class="detail-grid">
                        <div><strong>Name:</strong> ${topic.name}</div>
                        <div><strong>Type:</strong> ${topic.type}</div>
                        <div><strong>Subscribers:</strong> ${topic.subscribers}</div>
                        <div><strong>Messages:</strong> ${topic.messages}</div>
                        <div><strong>Last Message:</strong> ${topic.lastMessage ? new Date(topic.lastMessage).toLocaleString() : 'Never'}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Active Subscribers</h4>
                    <div class="subscribers-list">
                        ${subscribers.length > 0 ? 
                            subscribers.map(sub => `<div class="subscriber-item">${sub}</div>`).join('') :
                            '<div class="no-subscribers">No active subscribers</div>'
                        }
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Topic Actions</h4>
                    <div class="topic-actions">
                        <button class="btn btn-success" onclick="platform.subscribeToTopic('${topicName}')">
                            <i class="fas fa-plus"></i> Subscribe
                        </button>
                        <button class="btn btn-primary" onclick="platform.publishToTopic('${topicName}')">
                            <i class="fas fa-paper-plane"></i> Publish Test Message
                        </button>
                        <button class="btn btn-info" onclick="platform.refreshTopicSubscribers('${topicName}')">
                            <i class="fas fa-sync"></i> Refresh Subscribers
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.topicModal.style.display = 'block';
    }
    
    refreshTopicSubscribers(topicName) {
        // Refresh the topic details to get updated subscriber information
        this.showTopicDetails(topicName);
    }
    
    subscribeToTopic(topicName) {
        if (this.client && this.client.connected) {
            this.client.subscribe(topicName, (err) => {
                if (!err) {
                    console.log(`✅ Subscribed to ${topicName}`);
                    alert(`Successfully subscribed to ${topicName}`);
                } else {
                    console.error(`❌ Failed to subscribe to ${topicName}:`, err);
                    alert(`Failed to subscribe to ${topicName}`);
                }
            });
        } else {
            alert('MQTT client not connected');
        }
    }
    
    publishToTopic(topicName) {
        const message = {
            test: true,
            message: 'Test message from web dashboard',
            timestamp: new Date().toISOString(),
            source: 'web-dashboard'
        };
        
        if (this.client && this.client.connected) {
            this.client.publish(topicName, JSON.stringify(message));
            console.log(`📤 Published test message to ${topicName}`);
            alert(`Test message published to ${topicName}`);
        } else {
            alert('MQTT client not connected');
        }
    }
    
    closeModals() {
        this.deviceModal.style.display = 'none';
        this.topicModal.style.display = 'none';
    }
    
    // Existing methods from original dashboard
    connectToMQTT() {
        const wsUrl = `ws://localhost:9090`;
        
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
            
            // Update topic stats
            if (this.topics.has(topic)) {
                const topicData = this.topics.get(topic);
                topicData.messages++;
                topicData.lastMessage = timestamp;
                this.topics.set(topic, topicData);
            }
            
            // Handle different message types
            switch (topic) {
                case 'iot/device/register':
                    this.handleDeviceRegistration(data, timestamp);
                    break;
                case 'iot/device/status':
                    this.handleDeviceStatus(data, timestamp);
                    break;
                case 'iot/sensor/data':
                    this.handleSensorData(data, timestamp);
                    break;
                case 'iot/device/heartbeat':
                    this.handleDeviceHeartbeat(data, timestamp);
                    break;
                default:
                    this.handleGenericData(topic, data, timestamp);
            }
            
            // Add to data history
            this.addToDataHistory(topic, data, timestamp);
            
        } catch (e) {
            console.error('Error parsing message:', e);
            this.addToDataHistory(topic, message.toString(), new Date().toISOString());
        }
    }
    
    handleDeviceRegistration(data, timestamp) {
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
        
        this.updateDevicesList();
        this.updateDeviceCount();
        this.updateDeviceFilter();
        this.updateDevicesGrid();
        this.updateControlDevices();
        this.updateLogDevices();
    }
    
    handleDeviceStatus(data, timestamp) {
        if (this.devices.has(data.deviceId)) {
            const device = this.devices.get(data.deviceId);
            device.status = data.status;
            device.lastSeen = timestamp;
            this.devices.set(data.deviceId, device);
            this.updateDevicesList();
            this.updateDevicesGrid();
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
            this.updateDevicesGrid();
            
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
            this.updateDevicesGrid();
        }
    }
    
    handleGenericData(topic, data, timestamp) {
        console.log(`Received data on ${topic}:`, data);
    }
    
    checkSensorAlerts(sensorData, timestamp) {
        const alerts = [];
        
        if (sensorData.sensors) {
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
        if (this.filters.topic && !dataItem.topic.includes(this.filters.topic)) {
            return false;
        }
        
        if (this.filters.deviceId && dataItem.deviceId !== this.filters.deviceId) {
            return false;
        }
        
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
        this.isConnected = connected;
        const statusElement = this.connectionStatus;
        
        if (connected) {
            statusElement.className = 'status-indicator connected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
            
            // Show success notification
            this.message?.success('Connected to MQTT broker', 3);
        } else {
            statusElement.className = 'status-indicator disconnected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            
            // Show error notification
            this.message?.error('Disconnected from MQTT broker', 3);
        }
    }
    
    updateDeviceCount() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        this.deviceCount.textContent = `${devicesToShow.size} devices`;
    }
    
    updateDeviceFilter() {
        const deviceFilter = this.deviceFilter;
        const currentValue = deviceFilter.value;
        
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        deviceFilter.innerHTML = '<option value="">All Devices</option>';
        
        devicesToShow.forEach((device, deviceId) => {
            const option = document.createElement('option');
            option.value = deviceId;
            option.textContent = `${deviceId} (${device.deviceType || 'Unknown'})`;
            deviceFilter.appendChild(option);
        });
        
        if (currentValue && devicesToShow.has(currentValue)) {
            deviceFilter.value = currentValue;
        }
    }
    
    updateDevicesList() {
        const devicesToShow = this.deviceDataFromRedis.size > 0 ? this.deviceDataFromRedis : this.devices;
        
        if (devicesToShow.size === 0) {
            this.devicesList.innerHTML = '<div class="no-devices">No devices connected</div>';
            return;
        }
        
        const devicesHTML = Array.from(devicesToShow.values())
            .filter(device => {
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
    
    exportLogs() {
        const exportData = {
            logs: this.logs,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iot-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the platform when the page loads
let platform;
document.addEventListener('DOMContentLoaded', () => {
    platform = new IoTManagementPlatform();
});