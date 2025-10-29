#!/bin/bash

echo "🚀 IoT Management Platform - Separate Apps"
echo "=========================================="

# Kill any existing processes
echo "🔄 Stopping existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Start web server
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
else
    echo "❌ Web server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Start web app
echo "⚛️ Starting web app (port 3000)..."
cd ../web-app
npm install --silent
npm start &
APP_PID=$!

echo ""
echo "🌐 Access points:"
echo "   Web App: http://localhost:3000"
echo "   Web Server API: http://localhost:3001/api/status"
echo ""
echo "💡 To stop both apps, press Ctrl+C"
echo ""

# Keep script running
wait $SERVER_PID $APP_PID
