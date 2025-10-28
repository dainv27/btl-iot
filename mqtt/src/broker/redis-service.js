const { createClient } = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.error('❌ Redis: Too many reconnection attempts');
                            return new Error('Too many reconnection attempts');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                console.error('❌ Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('🔗 Redis: Connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('✅ Redis: Ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                console.log('🔌 Redis: Connection ended');
                this.isConnected = false;
            });

            await this.client.connect();
            return true;
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    // Device Management
    async storeDevice(deviceId, deviceData) {
        if (!this.isConnected) return false;
        
        try {
            const key = `device:${deviceId}`;
            await this.client.hSet(key, {
                deviceId: deviceData.deviceId,
                deviceType: deviceData.deviceType || 'unknown',
                location: deviceData.location || 'unknown',
                firmware: deviceData.firmware || 'unknown',
                capabilities: JSON.stringify(deviceData.capabilities || []),
                status: deviceData.status || 'offline',
                registeredAt: deviceData.registeredAt || new Date().toISOString(),
                lastSeen: deviceData.lastSeen || new Date().toISOString(),
                messageCount: deviceData.messageCount || 0,
                uptime: deviceData.uptime || 0,
                memory: JSON.stringify(deviceData.memory || {}),
                lastSensorData: JSON.stringify(deviceData.lastSensorData || {})
            });
            
            // Add to device index
            await this.client.sAdd('devices:index', deviceId);
            
            // Set expiration (7 days)
            await this.client.expire(key, 7 * 24 * 60 * 60);
            
            return true;
        } catch (error) {
            console.error('❌ Error storing device:', error);
            return false;
        }
    }

    async getDevice(deviceId) {
        if (!this.isConnected) return null;
        
        try {
            const key = `device:${deviceId}`;
            const deviceData = await this.client.hGetAll(key);
            
            if (Object.keys(deviceData).length === 0) {
                return null;
            }
            
            // Parse JSON fields
            return {
                ...deviceData,
                capabilities: JSON.parse(deviceData.capabilities || '[]'),
                memory: JSON.parse(deviceData.memory || '{}'),
                lastSensorData: JSON.parse(deviceData.lastSensorData || '{}'),
                messageCount: parseInt(deviceData.messageCount) || 0,
                uptime: parseFloat(deviceData.uptime) || 0
            };
        } catch (error) {
            console.error('❌ Error getting device:', error);
            return null;
        }
    }

    async getAllDevices() {
        if (!this.isConnected) return [];
        
        try {
            const deviceIds = await this.client.sMembers('devices:index');
            const devices = [];
            
            for (const deviceId of deviceIds) {
                const device = await this.getDevice(deviceId);
                if (device) {
                    devices.push(device);
                }
            }
            
            return devices;
        } catch (error) {
            console.error('❌ Error getting all devices:', error);
            return [];
        }
    }

    async updateDeviceStatus(deviceId, status, lastSeen) {
        if (!this.isConnected) return false;
        
        try {
            const key = `device:${deviceId}`;
            await this.client.hSet(key, {
                status: status,
                lastSeen: lastSeen || new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('❌ Error updating device status:', error);
            return false;
        }
    }

    async incrementDeviceMessageCount(deviceId) {
        if (!this.isConnected) return false;
        
        try {
            const key = `device:${deviceId}`;
            await this.client.hIncrBy(key, 'messageCount', 1);
            return true;
        } catch (error) {
            console.error('❌ Error incrementing message count:', error);
            return false;
        }
    }

    // Sensor Data Storage
    async storeSensorData(deviceId, sensorData) {
        if (!this.isConnected) return false;
        
        try {
            const timestamp = new Date().toISOString();
            const key = `sensor_data:${deviceId}`;
            
            // Store latest sensor data
            await this.client.hSet(key, {
                timestamp: timestamp,
                data: JSON.stringify(sensorData)
            });
            
            // Add to time series
            const timeSeriesKey = `sensor_timeseries:${deviceId}`;
            await this.client.zAdd(timeSeriesKey, {
                score: Date.now(),
                value: JSON.stringify({
                    timestamp: timestamp,
                    data: sensorData
                })
            });
            
            // Keep only last 1000 entries per device
            await this.client.zRemRangeByRank(timeSeriesKey, 0, -1001);
            
            // Set expiration (30 days)
            await this.client.expire(key, 30 * 24 * 60 * 60);
            await this.client.expire(timeSeriesKey, 30 * 24 * 60 * 60);
            
            return true;
        } catch (error) {
            console.error('❌ Error storing sensor data:', error);
            return false;
        }
    }

    async getLatestSensorData(deviceId) {
        if (!this.isConnected) return null;
        
        try {
            const key = `sensor_data:${deviceId}`;
            const data = await this.client.hGetAll(key);
            
            if (Object.keys(data).length === 0) {
                return null;
            }
            
            return {
                timestamp: data.timestamp,
                data: JSON.parse(data.data || '{}')
            };
        } catch (error) {
            console.error('❌ Error getting latest sensor data:', error);
            return null;
        }
    }

    async getSensorDataHistory(deviceId, limit = 100) {
        if (!this.isConnected) return [];
        
        try {
            const timeSeriesKey = `sensor_timeseries:${deviceId}`;
            const data = await this.client.zRevRange(timeSeriesKey, 0, limit - 1);
            
            return data.map(item => JSON.parse(item));
        } catch (error) {
            console.error('❌ Error getting sensor data history:', error);
            return [];
        }
    }

    // Alert Storage
    async storeAlert(alert) {
        if (!this.isConnected) return false;
        
        try {
            const alertId = `alert:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            const key = `alerts:${alert.deviceId}`;
            
            await this.client.hSet(alertId, {
                deviceId: alert.deviceId,
                type: alert.type,
                message: alert.message,
                value: alert.value || '',
                threshold: alert.threshold || '',
                timestamp: alert.timestamp || new Date().toISOString()
            });
            
            // Add to device alerts list
            await this.client.lPush(key, alertId);
            
            // Keep only last 50 alerts per device
            await this.client.lTrim(key, 0, 49);
            
            // Set expiration (7 days)
            await this.client.expire(alertId, 7 * 24 * 60 * 60);
            await this.client.expire(key, 7 * 24 * 60 * 60);
            
            return true;
        } catch (error) {
            console.error('❌ Error storing alert:', error);
            return false;
        }
    }

    async getDeviceAlerts(deviceId, limit = 50) {
        if (!this.isConnected) return [];
        
        try {
            const key = `alerts:${deviceId}`;
            const alertIds = await this.client.lRange(key, 0, limit - 1);
            const alerts = [];
            
            for (const alertId of alertIds) {
                const alert = await this.client.hGetAll(alertId);
                if (Object.keys(alert).length > 0) {
                    alerts.push({
                        ...alert,
                        value: parseFloat(alert.value) || 0,
                        threshold: parseFloat(alert.threshold) || 0
                    });
                }
            }
            
            return alerts;
        } catch (error) {
            console.error('❌ Error getting device alerts:', error);
            return [];
        }
    }

    async getAllAlerts(limit = 100) {
        if (!this.isConnected) return [];
        
        try {
            const devices = await this.getAllDevices();
            const allAlerts = [];
            
            for (const device of devices) {
                const alerts = await this.getDeviceAlerts(device.deviceId, 10);
                allAlerts.push(...alerts);
            }
            
            // Sort by timestamp (newest first)
            return allAlerts
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting all alerts:', error);
            return [];
        }
    }

    // Logging System
    async storeLog(log) {
        if (!this.isConnected) return false;
        
        try {
            const logId = `log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date().toISOString();
            
            await this.client.hSet(logId, {
                deviceId: log.deviceId || '',
                level: log.level || 'info',
                message: log.message || '',
                timestamp: log.timestamp || timestamp,
                topic: log.topic || '',
                data: JSON.stringify(log.data || {})
            });
            
            // Add to global logs list
            await this.client.lPush('logs:global', logId);
            
            // Add to device-specific logs if deviceId provided
            if (log.deviceId) {
                await this.client.lPush(`logs:device:${log.deviceId}`, logId);
                // Keep only last 1000 logs per device
                await this.client.lTrim(`logs:device:${log.deviceId}`, 0, 999);
            }
            
            // Keep only last 10000 global logs
            await this.client.lTrim('logs:global', 0, 9999);
            
            // Set expiration (30 days)
            await this.client.expire(logId, 30 * 24 * 60 * 60);
            
            return true;
        } catch (error) {
            console.error('❌ Error storing log:', error);
            return false;
        }
    }

    async getAllLogs(limit = 100) {
        if (!this.isConnected) return [];
        
        try {
            const logIds = await this.client.lRange('logs:global', 0, limit - 1);
            const logs = [];
            
            for (const logId of logIds) {
                const log = await this.client.hGetAll(logId);
                if (Object.keys(log).length > 0) {
                    logs.push({
                        ...log,
                        data: JSON.parse(log.data || '{}')
                    });
                }
            }
            
            return logs;
        } catch (error) {
            console.error('❌ Error getting all logs:', error);
            return [];
        }
    }

    async getDeviceLogs(deviceId, limit = 100) {
        if (!this.isConnected) return [];
        
        try {
            const key = `logs:device:${deviceId}`;
            const logIds = await this.client.lRange(key, 0, limit - 1);
            const logs = [];
            
            for (const logId of logIds) {
                const log = await this.client.hGetAll(logId);
                if (Object.keys(log).length > 0) {
                    logs.push({
                        ...log,
                        data: JSON.parse(log.data || '{}')
                    });
                }
            }
            
            return logs;
        } catch (error) {
            console.error('❌ Error getting device logs:', error);
            return [];
        }
    }

    // Device Management Extensions
    async deleteDevice(deviceId) {
        if (!this.isConnected) return false;
        
        try {
            const key = `device:${deviceId}`;
            
            // Remove device data
            await this.client.del(key);
            
            // Remove from device index
            await this.client.sRem('devices:index', deviceId);
            
            // Remove sensor data
            await this.client.del(`sensor_data:${deviceId}`);
            await this.client.del(`sensor_timeseries:${deviceId}`);
            
            // Remove alerts
            await this.client.del(`alerts:${deviceId}`);
            
            // Remove logs
            await this.client.del(`logs:device:${deviceId}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting device:', error);
            return false;
        }
    }

    async updateDeviceConfig(deviceId, config) {
        if (!this.isConnected) return false;
        
        try {
            const key = `device:${deviceId}`;
            await this.client.hSet(key, {
                config: JSON.stringify(config),
                configUpdatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('❌ Error updating device config:', error);
            return false;
        }
    }

    // Topic Management
    async storeTopicStats(topic, stats) {
        if (!this.isConnected) return false;
        
        try {
            const key = `topic:${topic}`;
            await this.client.hSet(key, {
                name: topic,
                subscribers: stats.subscribers || 0,
                messages: stats.messages || 0,
                lastMessage: stats.lastMessage || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
            
            // Add to topics index
            await this.client.sAdd('topics:index', topic);
            
            // Set expiration (7 days)
            await this.client.expire(key, 7 * 24 * 60 * 60);
            
            return true;
        } catch (error) {
            console.error('❌ Error storing topic stats:', error);
            return false;
        }
    }

    async getTopicStats() {
        if (!this.isConnected) return {};
        
        try {
            const topicIds = await this.client.sMembers('topics:index');
            const topics = {};
            
            for (const topicId of topicIds) {
                const topic = await this.client.hGetAll(`topic:${topicId}`);
                if (Object.keys(topic).length > 0) {
                    topics[topicId] = {
                        ...topic,
                        subscribers: parseInt(topic.subscribers) || 0,
                        messages: parseInt(topic.messages) || 0
                    };
                }
            }
            
            return topics;
        } catch (error) {
            console.error('❌ Error getting topic stats:', error);
            return {};
        }
    }

    // Statistics
    async getDeviceCount() {
        if (!this.isConnected) return 0;
        
        try {
            return await this.client.sCard('devices:index');
        } catch (error) {
            console.error('❌ Error getting device count:', error);
            return 0;
        }
    }

    async getAlertCount() {
        if (!this.isConnected) return 0;
        
        try {
            const devices = await this.getAllDevices();
            let totalAlerts = 0;
            
            for (const device of devices) {
                const alertCount = await this.client.lLen(`alerts:${device.deviceId}`);
                totalAlerts += alertCount;
            }
            
            return totalAlerts;
        } catch (error) {
            console.error('❌ Error getting alert count:', error);
            return 0;
        }
    }

    async getLogCount() {
        if (!this.isConnected) return 0;
        
        try {
            return await this.client.lLen('logs:global');
        } catch (error) {
            console.error('❌ Error getting log count:', error);
            return 0;
        }
    }

    // Health check
    async isHealthy() {
        if (!this.isConnected) return false;
        
        try {
            await this.client.ping();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RedisService;
