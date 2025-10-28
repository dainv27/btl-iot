#!/bin/sh

# Start MQTT Broker in background
echo "🚀 Starting MQTT Broker..."
node src/broker/broker.js &
BROKER_PID=$!

# Wait for broker to start
sleep 3

# Start Web Dashboard
echo "🌐 Starting Web Dashboard..."
node src/web/web-server.js &
WEB_PID=$!

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $BROKER_PID $WEB_PID 2>/dev/null
    wait $BROKER_PID $WEB_PID
    echo "✅ Services stopped"
    exit 0
}

# Handle signals
trap shutdown SIGTERM SIGINT

# Wait for processes
wait $BROKER_PID $WEB_PID
