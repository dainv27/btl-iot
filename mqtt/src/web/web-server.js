const express = require('express');
const path = require('path');
const config = require('../broker/config');
const RedisService = require('../broker/redis-service');

const app = express();
const PORT = 3000;

// Initialize Redis service
const redisService = new RedisService();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get broker status
app.get('/api/status', (req, res) => {
  res.json({
    broker: {
      mqttPort: config.mqttPort,
      wsPort: config.wsPort,
      status: 'running'
    },
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get IoT topics
app.get('/api/topics', (req, res) => {
  res.json({
    topics: [
      'iot/device/register',
      'iot/device/status',
      'iot/device/data',
      'iot/sensor/data',
      'iot/device/heartbeat',
      'iot/actuator/control'
    ]
  });
});

// API endpoint to get all devices from Redis
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await redisService.getAllDevices();
    res.json({
      success: true,
      devices: devices,
      count: devices.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get specific device info
app.get('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await redisService.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      device: device,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get latest sensor data for a device
app.get('/api/devices/:deviceId/sensor-data', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const sensorData = await redisService.getLatestSensorData(deviceId);
    
    res.json({
      success: true,
      deviceId: deviceId,
      sensorData: sensorData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor data',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get sensor data history for a device
app.get('/api/devices/:deviceId/sensor-history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const history = await redisService.getSensorDataHistory(deviceId, limit);
    
    res.json({
      success: true,
      deviceId: deviceId,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor history',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get device alerts
app.get('/api/devices/:deviceId/alerts', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await redisService.getDeviceAlerts(deviceId, limit);
    
    res.json({
      success: true,
      deviceId: deviceId,
      alerts: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching device alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device alerts',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const { deviceId, level, date } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    
    let logs = await redisService.getAllLogs(limit);
    
    // Apply filters
    if (deviceId) {
      logs = logs.filter(log => log.deviceId === deviceId);
    }
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    if (date) {
      const filterDate = new Date(date);
      logs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === filterDate.toDateString();
      });
    }
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      filters: { deviceId, level, date },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get device logs
app.get('/api/devices/:deviceId/logs', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const logs = await redisService.getDeviceLogs(deviceId, limit);
    
    res.json({
      success: true,
      deviceId: deviceId,
      logs: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching device logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device logs',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to send device command
app.post('/api/devices/:deviceId/command', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command, parameter } = req.body;
    
    // This would typically publish to MQTT broker
    // For now, we'll just log the command
    console.log(`📤 Device command: ${deviceId} - ${command} - ${parameter}`);
    
    res.json({
      success: true,
      deviceId: deviceId,
      command: command,
      parameter: parameter,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending device command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send device command',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to update device configuration
app.put('/api/devices/:deviceId/config', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const config = req.body;
    
    const success = await redisService.updateDeviceConfig(deviceId, config);
    
    if (success) {
      res.json({
        success: true,
        deviceId: deviceId,
        config: config,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Device not found',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating device config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device config',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to delete device
app.delete('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const success = await redisService.deleteDevice(deviceId);
    
    if (success) {
      res.json({
        success: true,
        deviceId: deviceId,
        message: 'Device deleted successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Device not found',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete device',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get topic statistics
app.get('/api/topics/stats', async (req, res) => {
  try {
    const stats = await redisService.getTopicStats();
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching topic stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topic stats',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to publish message to topic
app.post('/api/topics/:topicName/publish', async (req, res) => {
  try {
    const { topicName } = req.params;
    const message = req.body;
    
    // This would typically publish to MQTT broker
    console.log(`📤 Publishing to topic ${topicName}:`, message);
    
    res.json({
      success: true,
      topic: topicName,
      message: message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing to topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish to topic',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to get system statistics
app.get('/api/stats', async (req, res) => {
  try {
    const deviceCount = await redisService.getDeviceCount();
    const alertCount = await redisService.getAlertCount();
    const logCount = await redisService.getLogCount();
    
    res.json({
      success: true,
      stats: {
        devices: deviceCount,
        alerts: alertCount,
        logs: logCount,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system stats',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to check Redis health
app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await redisService.isHealthy();
    res.json({
      success: true,
      redis: {
        connected: redisService.isConnected,
        healthy: isHealthy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check health',
      timestamp: new Date().toISOString()
    });
  }
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Redis and start the web server
async function startWebServer() {
  // Connect to Redis
  console.log('🔗 Connecting to Redis...');
  const redisConnected = await redisService.connect();
  
  if (redisConnected) {
    console.log('✅ Redis connected successfully');
  } else {
    console.log('⚠️  Redis connection failed - continuing without persistence');
  }
  
  // Start the web server
  app.listen(PORT, () => {
    console.log(`🌐 Web Dashboard running on http://14.224.166.195:${PORT}`);
    console.log(`📊 IoT Device Monitor: http://14.224.166.195:${PORT}`);
    console.log(`🔗 MQTT Broker: mqtt://14.224.166.195:${config.mqttPort}`);
    console.log(`🔗 WebSocket: ws://14.224.166.195:${config.wsPort}`);
    console.log('\n💡 Usage:');
    console.log('   1. Start MQTT broker: npm start');
    console.log('   2. Open dashboard: http://14.224.166.195:3000');
    console.log('   3. Test with IoT device: npm run test:iot');
  });
}

startWebServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down web server...');
  
  // Disconnect Redis
  await redisService.disconnect();
  
  process.exit(0);
});
