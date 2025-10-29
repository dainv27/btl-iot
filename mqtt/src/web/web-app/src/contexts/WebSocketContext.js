import React, { createContext, useContext, useState, useEffect } from 'react';
import useWebSocket from './useWebSocket';
import { notification } from 'antd';

const WebSocketContext = createContext();

export const useRealtimeData = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useRealtimeData must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const { isConnected, lastMessage, error } = useWebSocket('ws://localhost:9091');

  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'devices':
          setDevices(lastMessage.data);
          break;
        
        case 'logs':
          setLogs(prevLogs => {
            const newLogs = [...lastMessage.data, ...prevLogs];
            return newLogs.slice(0, 100); // Keep only last 100 logs
          });
          break;
        
        case 'topics':
          setTopics(lastMessage.data);
          break;
        
        case 'log':
          setLogs(prevLogs => {
            const newLogs = [lastMessage.data, ...prevLogs];
            return newLogs.slice(0, 100);
          });
          
          // Show notification for important logs
          if (lastMessage.data.level === 'error' || lastMessage.data.level === 'warning') {
            notification[lastMessage.data.level]({
              message: `Log: ${lastMessage.data.deviceId}`,
              description: lastMessage.data.message,
              duration: 4.5,
            });
          }
          break;
        
        case 'sensor_data':
          setSensorData(prevData => ({
            ...prevData,
            [lastMessage.data.deviceId]: {
              ...lastMessage.data,
              timestamp: lastMessage.data.timestamp
            }
          }));
          break;
        
        case 'client_connected':
          notification.info({
            message: 'Device Connected',
            description: `Device ${lastMessage.data.clientId} connected`,
            duration: 3,
          });
          break;
        
        case 'client_disconnected':
          notification.warning({
            message: 'Device Disconnected',
            description: `Device ${lastMessage.data.clientId} disconnected`,
            duration: 3,
          });
          break;
        
        default:
          console.log('Unknown message type:', lastMessage.type);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (error) {
      notification.error({
        message: 'WebSocket Error',
        description: error,
        duration: 5,
      });
    }
  }, [error]);

  const value = {
    devices,
    logs,
    topics,
    sensorData,
    connectionStatus,
    isConnected,
    error,
    // Helper functions
    getDeviceById: (deviceId) => devices.find(d => d.deviceId === deviceId),
    getLogsByDevice: (deviceId) => logs.filter(log => log.deviceId === deviceId),
    getLatestSensorData: (deviceId) => sensorData[deviceId] || null,
    getLogsByLevel: (level) => logs.filter(log => log.level === level),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
