#!/bin/bash

echo "🚀 IoT Management Platform - Simple Test"
echo "========================================="

# Kill any existing processes
echo "🔄 Stopping existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Start web server first
echo "🔧 Starting web server (port 3001)..."
cd web-server
npm install --silent
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test server
echo "🧪 Testing web server..."
if curl -s http://localhost:3001/api/status > /dev/null; then
    echo "✅ Web server started successfully!"
    echo ""
    echo "🌐 Access points:"
    echo "   Web Server API: http://localhost:3001/api/status"
    echo "   Devices API: http://localhost:3001/api/devices"
    echo ""
    echo "💡 To test web app manually:"
    echo "   cd web-app && npm start"
    echo ""
    echo "💡 To stop server, press Ctrl+C"
    echo ""
    
    # Keep server running
    wait $SERVER_PID
else
    echo "❌ Web server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
