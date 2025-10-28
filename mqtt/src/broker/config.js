module.exports = {
  // MQTT broker configuration
  mqttPort: 1883,
  wsPort: 9090,
  
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
