#!/bin/sh

# Start MQTT Broker + Web Dashboard
echo "🚀 Starting MQTT Broker and Web Dashboard..."
node broker.js &
BROKER_PID=$!

# Wait for services to start
sleep 3

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $BROKER_PID 2>/dev/null
    wait $BROKER_PID
    echo "✅ Services stopped"
    exit 0
}

# Handle signals
trap shutdown SIGTERM SIGINT

# Wait for processes
wait $BROKER_PID
