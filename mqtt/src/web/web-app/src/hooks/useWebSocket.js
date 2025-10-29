import React, { useState, useEffect, useRef } from 'react';
import { notification } from 'antd';

const useWebSocket = (url, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          console.log('📡 WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch (err) {
            console.error('❌ Error parsing WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          console.log('📡 WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Max reconnection attempts reached');
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setError('WebSocket connection error');
        };

        setSocket(ws);
      } catch (err) {
        console.error('❌ Error creating WebSocket:', err);
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url, maxReconnectAttempts]);

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage
  };
};

export default useWebSocket;
