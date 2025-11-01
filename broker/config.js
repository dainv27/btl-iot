module.exports = {
  // MQTT broker configuration
  mqttHost: process.env.MQTT_HOST || 'localhost',
  mqttPort: parseInt(process.env.MQTT_PORT) || 1883,
  wsPort: parseInt(process.env.WS_PORT) || 9090,
  webPort: parseInt(process.env.WEB_PORT) || 3001,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication settings
  requireAuth: false, // Set to true to enable authentication
  
  // User credentials (used when requireAuth is true)
  users: [
    {
      username: 'admin',
      password: 'password123'
    },
    {
      username: 'user1',
      password: 'userpass'
    }
  ],
  
  // Broker settings
  brokerId: 'mqtt-broker-001',
  
  // Logging settings
  logLevel: 'info', // 'error', 'warn', 'info', 'debug'
  
  // Connection settings
  maxConnections: 1000,
  keepAlive: 60, // seconds
  
  // QoS settings
  maxQoS: 2,
  
  // Retain settings
  retainAvailable: true,
  
  // Will settings
  willAvailable: true
};
