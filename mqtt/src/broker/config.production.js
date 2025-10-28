module.exports = {
  // MQTT broker configuration
  mqttPort: process.env.MQTT_PORT || 1883,
  wsPort: process.env.WS_PORT || 9090,
  
  // Authentication settings
  requireAuth: process.env.REQUIRE_AUTH === 'true' || false,
  
  // User credentials (used when requireAuth is true)
  users: [
    {
      username: process.env.MQTT_USERNAME || 'admin',
      password: process.env.MQTT_PASSWORD || 'password123'
    }
  ],
  
  // Broker settings
  brokerId: process.env.BROKER_ID || 'mqtt-broker-prod',
  
  // Logging settings
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Connection settings
  maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 1000,
  keepAlive: parseInt(process.env.KEEP_ALIVE) || 60,
  
  // QoS settings
  maxQoS: 2,
  
  // Retain settings
  retainAvailable: true,
  
  // Will settings
  willAvailable: true,
  
  // Security settings
  allowAnonymous: process.env.ALLOW_ANONYMOUS !== 'false',
  
  // Rate limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    maxMessages: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
  }
};
