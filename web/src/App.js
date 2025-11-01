import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, Space, Row, Col, Statistic, Tag, Spin, Alert, Switch, Tooltip, Badge, Divider, Select, Input, Table, Timeline, Form, InputNumber, Switch as AntSwitch, message } from 'antd';
import { DesktopOutlined, ControlOutlined, FileTextOutlined, SendOutlined, ReloadOutlined, ClockCircleOutlined, WifiOutlined, WifiOutlined as WifiOffOutlined, SearchOutlined, FilterOutlined, SendOutlined as SendIcon, DashboardOutlined } from '@ant-design/icons';
import axios from 'axios';
import './App.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://202corp.com:3001';
const API_BASE_PATH = `${API_BASE_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [lastRefresh, setLastRefresh] = useState(null);
  
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  
  const [selectedDevice, setSelectedDevice] = useState('');
  const [commandData, setCommandData] = useState('');
  const [sendingCommand, setSendingCommand] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [sensorDataHistory, setSensorDataHistory] = useState([]);
  const [currentSensorData, setCurrentSensorData] = useState(null);
  
  const refreshIntervalRef = useRef(null);
  const sensorDataIntervalRef = useRef(null);

  useEffect(() => {
    testApiConnection();
    loadDevices();
    loadLogs();
    loadTopics();
  }, []);

  const loadSensorData = async () => {
    if (!selectedDevice) return;
    
    try {
      const response = await axios.get(`${API_BASE_PATH}/sensor-data/${selectedDevice}`);
      console.log('[DEBUG] Sensor data response:', response.data);
      
      if (response.data && response.data.success && response.data.data) {
        const sensorData = response.data.data;
        
        if (sensorData.temperature !== undefined || sensorData.humidity !== undefined) {
          setCurrentSensorData({
            deviceId: sensorData.deviceId,
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            timestamp: sensorData.timestamp || Date.now()
          });
          
          setSensorDataHistory(prev => {
            const updated = [...prev, {
              deviceId: sensorData.deviceId,
              temperature: sensorData.temperature,
              humidity: sensorData.humidity,
              timestamp: new Date(sensorData.timestamp || Date.now())
            }];
            return updated.slice(-50);
          });
        }
      }
    } catch (error) {
      console.error('[DEBUG] Load sensor data error:', error);
    }
  };

  useEffect(() => {
    if (selectedDevice && activeTab === 'control') {
      loadSensorData();
      sensorDataIntervalRef.current = setInterval(() => {
        loadSensorData();
      }, 1000);
    } else {
      if (sensorDataIntervalRef.current) {
        clearInterval(sensorDataIntervalRef.current);
        sensorDataIntervalRef.current = null;
      }
    }
    
    return () => {
      if (sensorDataIntervalRef.current) {
        clearInterval(sensorDataIntervalRef.current);
        sensorDataIntervalRef.current = null;
      }
    };
  }, [selectedDevice, activeTab]);

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        switch (activeTab) {
          case 'devices':
            loadDevices();
            break;
          case 'logs':
            loadLogs();
            break;
          case 'topics':
            loadTopics();
            break;
          default:
            break;
        }
      }, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, activeTab]);

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const testApiConnection = async () => {
    console.log('[DEBUG] Testing API connection to:', `${API_BASE_PATH}/status`);
    try {
      const response = await axios.get(`${API_BASE_PATH}/status`);
      console.log('[DEBUG] API status response:', response.status);
      console.log('[DEBUG] API status data:', response.data);
      
      if (response.data && response.data.broker && response.data.mqtt) {
        setApiStatus(response.data);
        setError(null);
        console.log('[DEBUG] API Status set:', response.data);
      } else {
        console.warn('[DEBUG] Unexpected API status format:', response.data);
        setError('Invalid API response format');
      }
    } catch (err) {
      console.error('[DEBUG] API connection error:', err);
      console.error('[DEBUG] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        request: err.request
      });
      setApiStatus(null);
      if (err.response) {
        setError(`API Error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        setError(`Cannot connect to API server at ${API_BASE_URL}. Please make sure the broker is running.`);
      } else {
        setError('Failed to connect to API server.');
      }
    }
  };

  const loadDevices = async () => {
    console.log('[DEBUG] Loading devices from:', `${API_BASE_PATH}/devices`);
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_PATH}/devices`);
      console.log('[DEBUG] Devices response status:', response.status);
      console.log('[DEBUG] Devices response data:', response.data);
      
      if (response.data && Array.isArray(response.data.devices)) {
        console.log('[DEBUG] Loaded devices count:', response.data.devices.length);
        setDevices(response.data.devices);
        
        // Auto-select first device if available and no device is selected (only on initial load)
        if (response.data.devices.length > 0 && !selectedDevice && devices.length === 0) {
          setSelectedDevice(response.data.devices[0].deviceId);
          console.log('[DEBUG] Auto-selected first device:', response.data.devices[0].deviceId);
        }
        
        setLastRefresh(new Date());
        setError(null);
        console.log('[DEBUG] Devices set successfully');
      } else {
        console.warn('[DEBUG] Unexpected devices response format:', response.data);
        setDevices([]);
        setError('Invalid devices response format');
      }
    } catch (err) {
      console.error('[DEBUG] Load devices error:', err);
      console.error('[DEBUG] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setDevices([]);
      if (err.response?.data?.error) {
        setError(`Failed to load devices: ${err.response.data.error}`);
      } else {
        setError('Failed to load devices');
      }
    } finally {
      setLoading(false);
      console.log('[DEBUG] Load devices completed');
    }
  };

  const loadLogs = async () => {
    console.log('[DEBUG] Loading logs with filters:', { logLevelFilter, deviceFilter });
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (logLevelFilter) params.append('level', logLevelFilter);
      if (deviceFilter) params.append('deviceId', deviceFilter);
      params.append('limit', '50');
      
      const url = `${API_BASE_PATH}/logs?${params}`;
      console.log('[DEBUG] Loading logs from:', url);
      
      const response = await axios.get(url);
      console.log('[DEBUG] Logs response status:', response.status);
      console.log('[DEBUG] Logs response data:', response.data);
      
      if (response.data && Array.isArray(response.data.logs)) {
        console.log('[DEBUG] Loaded logs count:', response.data.logs.length);
        setLogs(response.data.logs);
        setLastRefresh(new Date());
        setError(null);
      } else {
        console.warn('[DEBUG] Unexpected logs response format:', response.data);
        setLogs([]);
        setError('Invalid logs response format');
      }
    } catch (err) {
      console.error('[DEBUG] Load logs error:', err);
      console.error('[DEBUG] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setLogs([]);
      if (err.response?.data?.error) {
        setError(`Failed to load logs: ${err.response.data.error}`);
      } else {
        setError('Failed to load logs');
      }
    } finally {
      setLoading(false);
      console.log('[DEBUG] Load logs completed');
    }
  };

  const loadTopics = async () => {
    console.log('[DEBUG] Loading topics from:', `${API_BASE_PATH}/topics`);
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_PATH}/topics`);
      console.log('[DEBUG] Topics response status:', response.status);
      console.log('[DEBUG] Topics response data:', response.data);
      
      if (response.data && Array.isArray(response.data.topics)) {
        console.log('[DEBUG] Loaded topics count:', response.data.topics.length);
        setTopics(response.data.topics);
        setLastRefresh(new Date());
        setError(null);
        console.log('[DEBUG] Topics set successfully');
      } else {
        console.warn('[DEBUG] Unexpected topics response format:', response.data);
        setTopics([]);
        setError('Invalid topics response format');
      }
    } catch (err) {
      console.error('[DEBUG] Load topics error:', err);
      console.error('[DEBUG] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setTopics([]);
      if (err.response?.data?.error) {
        setError(`Failed to load topics: ${err.response.data.error}`);
      } else {
        setError('Failed to load topics');
      }
    } finally {
      setLoading(false);
      console.log('[DEBUG] Load topics completed');
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (bytes) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getStatusIcon = (status) => {
    return status === 'online' ? <WifiOutlined /> : <WifiOffOutlined />;
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      case 'debug': return 'green';
      default: return 'default';
    }
  };

  const getTopicTypeColor = (type) => {
    switch (type) {
      case 'device': return 'blue';
      case 'sensor': return 'green';
      case 'actuator': return 'orange';
      case 'system': return 'purple';
      default: return 'default';
    }
  };

  const sendCommand = async () => {
    console.log('[DEBUG] sendCommand called');
    console.log('[DEBUG] selectedDevice:', selectedDevice);
    console.log('[DEBUG] commandData:', commandData);
    
    if (!selectedDevice) {
      console.warn('[DEBUG] No device selected');
      message.error('Vui lòng chọn thiết bị');
      return;
    }
    
    if (!commandData) {
      console.warn('[DEBUG] No command data');
      message.error('Vui lòng nhập dữ liệu lệnh');
      return;
    }
    
    setSendingCommand(true);
    console.log('[DEBUG] Setting sendingCommand to true');
    
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(commandData);
        console.log('[DEBUG] Parsed JSON data:', parsedData);
      } catch (e) {
        parsedData = commandData;
        console.log('[DEBUG] Using plain text data:', parsedData);
      }
      
      const topic = `iot/sensor/ctl/${selectedDevice}`;
      console.log('[DEBUG] Generated topic:', topic);
      console.log('[DEBUG] Sending command to:', `${API_BASE_PATH}/devices/${selectedDevice}/command`);
      
      const payload = {
        topic: topic,
        data: parsedData,
        qos: 0,
        retain: false
      };
      console.log('[DEBUG] Request payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(`${API_BASE_PATH}/devices/${selectedDevice}/command`, payload);
      console.log('[DEBUG] Response received:', response.data);
      console.log('[DEBUG] Response status:', response.status);
      
      if (response.data && response.data.success) {
        console.log('[DEBUG] Command sent successfully');
        message.success(`Đã gửi lệnh thành công đến ${selectedDevice}`);
        console.log('[DEBUG] Full response:', JSON.stringify(response.data, null, 2));
        
        // Add to command history
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          deviceId: selectedDevice,
          topic: topic,
          data: parsedData,
          status: 'success',
          response: response.data
        };
        setCommandHistory(prev => [historyEntry, ...prev].slice(0, 50)); // Keep last 50 commands
        
        setCommandData('');
        console.log('[DEBUG] Cleared command data');
        loadLogs();
      } else {
        const errorMsg = response.data?.error || 'Gửi lệnh thất bại';
        console.error('[DEBUG] Command failed:', errorMsg);
        console.error('[DEBUG] Response data:', response.data);
        
        // Add to command history with failed status
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          deviceId: selectedDevice,
          topic: topic,
          data: parsedData,
          status: 'failed',
          error: errorMsg
        };
        setCommandHistory(prev => [historyEntry, ...prev].slice(0, 50));
        
        message.error(errorMsg);
      }
    } catch (error) {
      console.error('[DEBUG] Send command error:', error);
      console.error('[DEBUG] Error message:', error.message);
      console.error('[DEBUG] Error stack:', error.stack);
      
      // Add to command history on error
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        deviceId: selectedDevice || 'unknown',
        topic: selectedDevice ? `iot/sensor/ctl/${selectedDevice}` : 'unknown',
        data: commandData,
        status: 'error',
        error: error.message || 'Lỗi không xác định'
      };
      setCommandHistory(prev => [historyEntry, ...prev].slice(0, 50));
      
      if (error.response) {
        console.error('[DEBUG] Error response status:', error.response.status);
        console.error('[DEBUG] Error response data:', error.response.data);
        console.error('[DEBUG] Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('[DEBUG] No response received. Request:', error.request);
      } else {
        console.error('[DEBUG] Error setting up request:', error.message);
      }
      
      if (error.response?.data?.error) {
        message.error(`Lỗi: ${error.response.data.error}`);
      } else if (error.response?.status === 400) {
        message.error('Tham số lệnh không hợp lệ');
      } else if (error.response?.status === 404) {
        message.error('Không tìm thấy thiết bị');
      } else {
        message.error('Gửi lệnh thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSendingCommand(false);
      console.log('[DEBUG] Setting sendingCommand to false');
    }
  };

  const tabs = [
    { key: 'overview', label: 'Tổng quan dự án', icon: <DashboardOutlined /> },
    { key: 'devices', label: 'Thiết bị', icon: <DesktopOutlined /> },
    { key: 'control', label: 'Điều khiển', icon: <ControlOutlined /> },
    { key: 'logs', label: 'Nhật ký', icon: <FileTextOutlined /> },
    { key: 'topics', label: 'Topic', icon: <SendOutlined /> }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Card 
            title="Tổng quan dự án"
            className="content-card"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={3}>IoT Device Management System - Nhóm 10</Title>
                <Text type="secondary">
                  Hệ thống quản lý và điều khiển thiết bị IoT sử dụng MQTT protocol
                </Text>
              </div>

              <Divider />

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12} lg={8}>
                  <Card title="Thống kê tổng quan" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Tổng thiết bị:</Text>
                        <Text strong>{devices.length}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Đang online:</Text>
                        <Tag color="green">{devices.filter(d => d.status === 'online').length}</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Đang offline:</Text>
                        <Tag color="red">{devices.filter(d => d.status === 'offline').length}</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Tổng logs:</Text>
                        <Text strong>{logs.length}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Tổng topics:</Text>
                        <Text strong>{topics.length}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Card title="Kết nối" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>API Server:</Text>
                        <Tag color={apiStatus ? 'green' : 'red'}>
                          {apiStatus ? 'Kết nối' : 'Mất kết nối'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>MQTT Broker:</Text>
                        <Tag color={apiStatus?.mqtt?.connected ? 'green' : 'red'}>
                          {apiStatus?.mqtt?.connected ? 'Kết nối' : 'Mất kết nối'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Redis:</Text>
                        <Tag color={apiStatus?.redis?.connected ? 'green' : 'red'}>
                          {apiStatus?.redis?.connected ? 'Kết nối' : 'Mất kết nối'}
                        </Tag>
                      </div>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                  <Card title="Thông tin hệ thống" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Cổng MQTT:</Text>
                        <Text code style={{ marginLeft: 8 }}>
                          {apiStatus?.broker?.mqttPort || 'N/A'}
                        </Text>
                      </div>
                      <div>
                        <Text strong>Cổng API Server:</Text>
                        <Text code style={{ marginLeft: 8 }}>
                          {apiStatus?.server?.port || 'N/A'}
                        </Text>
                      </div>
                      {lastRefresh && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
                          </Text>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Card title="Các chức năng chính" size="small">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                        <DesktopOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                        <Text strong>Quản lý thiết bị</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Xem danh sách, trạng thái và thông tin chi tiết của các thiết bị IoT
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                        <ControlOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                        <Text strong>Điều khiển thiết bị</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Gửi lệnh điều khiển đến thiết bị qua MQTT protocol
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                        <FileTextOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                        <Text strong>Nhật ký hệ thống</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Xem log hoạt động của hệ thống và các thiết bị
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                        <SendOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                        <Text strong>Quản lý topics</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Xem danh sách và thống kê các MQTT topics
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Space>
          </Card>
        );
      case 'devices':
        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Device Management</span>
                <Space>
                  <Tooltip title="Auto-refresh every 5 seconds">
                    <Switch 
                      checked={autoRefresh} 
                      onChange={setAutoRefresh}
                      checkedChildren="Auto"
                      unCheckedChildren="Manual"
                    />
                  </Tooltip>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    onClick={loadDevices} 
                    loading={loading}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Space>
              </div>
            }
            className="content-card"
            extra={
              lastRefresh && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <ClockCircleOutlined /> Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
                </Text>
              )
            }
          >
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Tổng thiết bị" value={devices.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Đang online" 
                    value={devices.filter(d => d.status === 'online').length}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Đang offline" 
                    value={devices.filter(d => d.status === 'offline').length}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Tin nhắn" 
                    value={devices.reduce((sum, d) => sum + (d.messageCount || 0), 0)}
                  />
                </Col>
              </Row>
            </div>
            
            <Divider />

            {loading && <Spin style={{ marginTop: 16 }} />}
            
            {devices.length > 0 && (
              <div className="devices-list" style={{ marginTop: 16 }}>
                <Row gutter={[16, 16]}>
                {devices.map(device => (
                    <Col key={device.deviceId} xs={24} sm={12} lg={8} xl={6}>
                      <Card 
                        size="small" 
                        hoverable
                        style={{ height: '100%' }}
                        title={
                          <Space>
                            <Badge 
                              status={device.status === 'online' ? 'success' : 'error'} 
                              text={
                    <Space>
                                  {getStatusIcon(device.status)}
                                  <Text strong>{device.deviceId}</Text>
                                </Space>
                              }
                            />
                          </Space>
                        }
                        extra={
                      <Tag color={device.status === 'online' ? 'green' : 'red'}>
                        {device.status === 'online' ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </Tag>
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">Loại:</Text>
                            <br />
                            <Tag color="blue">{device.deviceType}</Tag>
                          </div>
                          
                          <div>
                            <Text type="secondary">Vị trí:</Text>
                            <br />
                            <Text>{device.location}</Text>
                          </div>
                          
                          <div>
                            <Text type="secondary">Phiên bản:</Text>
                            <br />
                            <Text code>{device.firmware}</Text>
                          </div>
                          
                          <div>
                            <Text type="secondary">Khả năng:</Text>
                            <br />
                            <Space wrap>
                              {device.capabilities?.map(cap => (
                                <Tag key={cap} size="small">{cap}</Tag>
                              ))}
                            </Space>
                          </div>
                          
                          <Divider style={{ margin: '8px 0' }} />
                          
                          <Row gutter={8}>
                            <Col span={12}>
                              <Statistic 
                                title="Thời gian hoạt động" 
                                value={formatUptime(device.uptime || 0)}
                                valueStyle={{ fontSize: '12px' }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic 
                                title="Tin nhắn" 
                                value={device.messageCount || 0}
                                valueStyle={{ fontSize: '12px' }}
                              />
                            </Col>
                          </Row>
                          
                          <div>
                            <Text type="secondary">Bộ nhớ:</Text>
                            <br />
                            <Text style={{ fontSize: '12px' }}>
                              {formatMemory(device.memory?.heapUsed || 0)} / {formatMemory(device.memory?.heapTotal || 0)}
                            </Text>
                          </div>
                          
                          {device.lastSensorData && (
                            <div>
                              <Text type="secondary">Dữ liệu cuối:</Text>
                              <br />
                              <Space wrap>
                                {Object.entries(device.lastSensorData.sensors || {}).map(([key, sensor]) => (
                                  <Tag key={key} size="small">
                                    {key}: {sensor.value} {sensor.unit}
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          )}
                          
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Lần cuối: {new Date(device.lastSeen).toLocaleString()}
                            </Text>
                          </div>
                    </Space>
                  </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
            
            {devices.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Không tìm thấy thiết bị</Text>
                <br />
                <Button type="link" onClick={loadDevices}>
                  Tải thiết bị
                </Button>
              </div>
            )}
          </Card>
        );
      case 'control':
        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Điều khiển thiết bị</span>
                <Space>
                  <Tag color={apiStatus?.mqtt?.connected ? 'green' : 'red'}>
                    MQTT {apiStatus?.mqtt?.connected ? 'Đã kết nối' : 'Mất kết nối'}
                  </Tag>
                </Space>
              </div>
            }
            className="content-card"
          >
            <Row gutter={24}>
              {/* Command Form */}
              <Col xs={24} lg={18}>
                {/* Device Selection */}
                <Card size="small" style={{ marginBottom: 16 }}>
                  <div>
                    <Text strong>Chọn thiết bị:</Text>
                    <Select
                      placeholder="Chọn thiết bị"
                      style={{ width: '100%', marginTop: 8 }}
                      value={selectedDevice}
                      onChange={setSelectedDevice}
                      showSearch
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {devices.map(device => (
                        <Option key={device.deviceId} value={device.deviceId}>
                          <Space>
                            <Badge 
                              status={device.status === 'online' ? 'success' : 'error'} 
                              text={device.deviceId}
                            />
                            <Text type="secondary">({device.deviceType})</Text>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </div>
                </Card>
                
                {/* Real-time Chart */}
                {selectedDevice && (
                  <Card 
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span>Dữ liệu thời gian thực - {selectedDevice}</span>
                        <Space size="small" style={{ marginLeft: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 12, height: 12, backgroundColor: '#ff4d4f', borderRadius: 2 }}></div>
                            <Text style={{ fontSize: '12px' }}>Nhiệt độ</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 12, height: 12, backgroundColor: '#1890ff', borderRadius: 2 }}></div>
                            <Text style={{ fontSize: '12px' }}>Độ ẩm</Text>
                          </div>
                        </Space>
                      </div>
                    }
                    size="small"
                    style={{ marginBottom: 16 }}
                    extra={
                      currentSensorData && (
                        <Space>
                          <Tag color="red">Nhiệt độ: {currentSensorData.temperature}°C</Tag>
                          <Tag color="blue">Độ ẩm: {currentSensorData.humidity}%</Tag>
                        </Space>
                      )
                    }
                  >
                    {sensorDataHistory.length > 0 ? (
                      <div style={{ width: '100%', height: '333px', position: 'relative' }}>
                        <svg 
                          width="100%" 
                          height="100%" 
                          viewBox="0 0 1000 333"
                          preserveAspectRatio="none"
                          style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}
                        >
                          {(() => {
                            const padding = 50;
                            const width = 1000;
                            const height = 333;
                            const chartWidth = width - 2 * padding;
                            const chartHeight = height - 2 * padding;
                            
                            const tempData = sensorDataHistory.map(d => d.temperature || 0);
                            const humData = sensorDataHistory.map(d => d.humidity || 0);
                            const maxTemp = Math.max(...tempData, 35);
                            const minTemp = Math.min(...tempData, 15);
                            const maxHum = Math.max(...humData, 100);
                            const minHum = Math.min(...humData, 0);
                            
                            const tempRange = maxTemp - minTemp || 20;
                            const humRange = maxHum - minHum || 100;
                            
                            const getX = (index) => padding + (index / (sensorDataHistory.length - 1 || 1)) * chartWidth;
                            const getTempY = (value) => padding + chartHeight - ((value - minTemp) / tempRange) * chartHeight;
                            const getHumY = (value) => padding + chartHeight - ((value - minHum) / humRange) * chartHeight;
                            
                            const tempPath = sensorDataHistory.map((d, i) => {
                              const x = getX(i);
                              const y = getTempY(d.temperature || 0);
                              return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                            }).join(' ');
                            
                            const humPath = sensorDataHistory.map((d, i) => {
                              const x = getX(i);
                              const y = getHumY(d.humidity || 0);
                              return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                            }).join(' ');
                            
                            return (
                              <g>
                                {/* Grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                  <g key={i}>
                                    <line
                                      x1={padding}
                                      y1={padding + ratio * chartHeight}
                                      x2={width - padding}
                                      y2={padding + ratio * chartHeight}
                                      stroke="#f0f0f0"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={padding - 50}
                                      y={padding + ratio * chartHeight + 4}
                                      fontSize="12"
                                      fill="#8c8c8c"
                                    >
                                      {ratio === 0 ? Math.round(maxTemp) : ratio === 1 ? Math.round(minTemp) : ''}
                                    </text>
                                    <text
                                      x={width - padding + 15}
                                      y={padding + ratio * chartHeight + 4}
                                      fontSize="12"
                                      fill="#8c8c8c"
                                    >
                                      {ratio === 0 ? Math.round(maxHum) : ratio === 1 ? Math.round(minHum) : ''}
                                    </text>
                                  </g>
                                ))}
                                
                                {/* Temperature line */}
                                <path
                                  d={tempPath}
                                  fill="none"
                                  stroke="#ff4d4f"
                                  strokeWidth="3"
                                />
                                
                                {/* Humidity line */}
                                <path
                                  d={humPath}
                                  fill="none"
                                  stroke="#1890ff"
                                  strokeWidth="3"
                                />
                                
                                {/* Data points */}
                                {sensorDataHistory.map((d, i) => (
                                  <g key={i}>
                                    <circle
                                      cx={getX(i)}
                                      cy={getTempY(d.temperature || 0)}
                                      r="4"
                                      fill="#ff4d4f"
                                    />
                                    <circle
                                      cx={getX(i)}
                                      cy={getHumY(d.humidity || 0)}
                                      r="4"
                                      fill="#1890ff"
                                    />
                                  </g>
                                ))}
                                
                                {/* Y-axis labels */}
                                <text
                                  x={width / 2}
                                  y={padding - 15}
                                  fontSize="14"
                                  fill="#595959"
                                  textAnchor="middle"
                                  fontWeight="bold"
                                >
                                  Nhiệt độ (°C) / Độ ẩm (%)
                                </text>
                              </g>
                            );
                          })()}
                        </svg>
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 24 }}>
                          <Space>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 12, height: 12, backgroundColor: '#ff4d4f', borderRadius: 2 }}></div>
                              <Text style={{ fontSize: '12px' }}>Nhiệt độ</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 12, height: 12, backgroundColor: '#1890ff', borderRadius: 2 }}></div>
                              <Text style={{ fontSize: '12px' }}>Độ ẩm</Text>
                            </div>
                          </Space>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '333px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
                        <Text type="secondary">Đang tải dữ liệu...</Text>
                      </div>
                    )}
                  </Card>
                )}
                
                <Card title="Gửi lệnh" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Topic Display */}
                    {selectedDevice && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ minWidth: '70px' }}>Topic:</Text>
                        <div style={{ flex: 1, padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                          <Text code style={{ fontSize: '14px' }}>
                            iot/sensor/ctl/{selectedDevice}
                          </Text>
                        </div>
                      </div>
                    )}

                    {/* Command Data */}
                    <div>
                      <Text strong>Dữ liệu lệnh (JSON):</Text>
                      <Input.TextArea
                        placeholder='{"action": "restart", "timestamp": "2024-01-01T00:00:00.000Z"}'
                        value={commandData}
                        onChange={(e) => setCommandData(e.target.value)}
                        rows={6}
                        style={{ marginTop: 8 }}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Nhập dữ liệu JSON hoặc văn bản thường.
                      </Text>
                    </div>

                    {/* Send Button */}
                    <Button
                      type="primary"
                      icon={<SendIcon />}
                      onClick={sendCommand}
                      loading={sendingCommand}
                      disabled={!selectedDevice || !commandData}
                      size="large"
                      style={{ width: '100%' }}
                    >
                      Gửi lệnh
                    </Button>
                  </Space>
                </Card>
              </Col>

              {/* Connection Status */}
              <Col xs={24} lg={6}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Card title="Connection Status" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>API Server:</Text>
                        <Tag color={apiStatus ? 'green' : 'red'}>
                          {apiStatus ? 'Connected' : 'Disconnected'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>MQTT Broker:</Text>
                        <Tag color={apiStatus?.mqtt?.connected ? 'green' : 'red'}>
                          {apiStatus?.mqtt?.connected ? 'Connected' : 'Disconnected'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Redis:</Text>
                        <Tag color={apiStatus?.redis?.connected ? 'green' : 'red'}>
                          {apiStatus?.redis?.connected ? 'Connected' : 'Disconnected'}
                        </Tag>
                      </div>
                    </Space>
                  </Card>

                  {/* Command History */}
                  <Card 
                    title="Command History" 
                    size="small"
                    extra={
                      commandHistory.length > 0 && (
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => setCommandHistory([])}
                        >
                          Clear
                        </Button>
                      )
                    }
                    style={{ maxHeight: '500px', overflow: 'auto' }}
                  >
                    {commandHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                        <Text type="secondary">No commands sent yet</Text>
                      </div>
                    ) : (
                      <Timeline size="small">
                        {commandHistory.map((cmd, index) => (
                          <Timeline.Item
                            key={cmd.id}
                            color={cmd.status === 'success' ? 'green' : 'red'}
                            dot={cmd.status === 'success' ? <ClockCircleOutlined /> : <ClockCircleOutlined />}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: '12px' }}>{cmd.deviceId}</Text>
                                <Tag color={cmd.status === 'success' ? 'green' : 'red'} size="small">
                                  {cmd.status}
                                </Tag>
                              </div>
                              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                                {new Date(cmd.timestamp).toLocaleTimeString()}
                              </Text>
                              <Text code style={{ fontSize: '10px', display: 'block', marginBottom: 4 }}>
                                {cmd.topic}
                              </Text>
                              <div style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: 4,
                                maxHeight: '60px',
                                overflow: 'auto',
                                fontSize: '10px'
                              }}>
                                <Text style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                                  {typeof cmd.data === 'object' 
                                    ? JSON.stringify(cmd.data, null, 2).substring(0, 100)
                                    : String(cmd.data).substring(0, 100)}
                                  {(typeof cmd.data === 'object' && JSON.stringify(cmd.data).length > 100) ||
                                   (typeof cmd.data === 'string' && cmd.data.length > 100)
                                    ? '...' : ''}
                                </Text>
                              </div>
                            </div>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    )}
                  </Card>
                </Space>
              </Col>
            </Row>
          </Card>
        );
      case 'logs':
        const filteredLogs = logs.filter(log => {
          const matchesSearch = !topicSearch || 
            log.message.toLowerCase().includes(topicSearch.toLowerCase()) ||
            log.deviceId.toLowerCase().includes(topicSearch.toLowerCase()) ||
            log.topic.toLowerCase().includes(topicSearch.toLowerCase());
          return matchesSearch;
        });

        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nhật ký hệ thống</span>
                <Space>
                  <Tooltip title="Tự động làm mới mỗi 5 giây">
                    <Switch 
                      checked={autoRefresh} 
                      onChange={setAutoRefresh}
                      checkedChildren="Tự động"
                      unCheckedChildren="Thủ công"
                    />
                  </Tooltip>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    onClick={loadLogs} 
                    loading={loading}
                    size="small"
                  >
                    Làm mới
                  </Button>
                </Space>
              </div>
            }
            className="content-card"
            extra={
              lastRefresh && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <ClockCircleOutlined /> Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
                </Text>
              )
            }
          >
            {/* Log Statistics */}
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Tổng logs" value={logs.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Lỗi" 
                    value={logs.filter(l => l.level === 'error').length}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Cảnh báo" 
                    value={logs.filter(l => l.level === 'warning').length}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Thông tin" 
                    value={logs.filter(l => l.level === 'info').length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Filters */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Select
                    placeholder="Lọc theo mức độ"
                    allowClear
                    style={{ width: '100%' }}
                    value={logLevelFilter}
                    onChange={setLogLevelFilter}
                  >
                    <Option value="error">Lỗi</Option>
                    <Option value="warning">Cảnh báo</Option>
                    <Option value="info">Thông tin</Option>
                    <Option value="debug">Debug</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Select
                    placeholder="Lọc theo thiết bị"
                    allowClear
                    style={{ width: '100%' }}
                    value={deviceFilter}
                    onChange={setDeviceFilter}
                  >
                    {devices.map(device => (
                      <Option key={device.deviceId} value={device.deviceId}>
                        {device.deviceId}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={8}>
                  <Search
                    placeholder="Tìm kiếm logs..."
                    allowClear
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    onSearch={setTopicSearch}
                  />
                </Col>
              </Row>
            </div>

            {loading && <Spin style={{ marginTop: 16 }} />}
            
            {filteredLogs.length > 0 ? (
              <Timeline>
                {filteredLogs.map((log, index) => (
                  <Timeline.Item
                    key={index}
                    color={getLogLevelColor(log.level)}
                    dot={
                      <Tag color={getLogLevelColor(log.level)} size="small">
                        {log.level.toUpperCase()}
                      </Tag>
                    }
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Space>
                        <Text strong>{log.deviceId}</Text>
                        <Text type="secondary">{new Date(log.timestamp).toLocaleString()}</Text>
                        <Tag color="blue" size="small">{log.topic}</Tag>
                      </Space>
                    </div>
                    <Text>{log.message}</Text>
                    {log.data && Object.keys(log.data).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Data: {JSON.stringify(log.data, null, 2)}
                        </Text>
                      </div>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Không tìm thấy logs</Text>
                <br />
                <Button type="link" onClick={loadLogs}>
                  Tải logs
                </Button>
              </div>
            )}
          </Card>
        );
      case 'topics':
        const filteredTopics = topics.filter(topic => {
          const matchesSearch = !topicSearch || 
            topic.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
            topic.type.toLowerCase().includes(topicSearch.toLowerCase()) ||
            topic.description.toLowerCase().includes(topicSearch.toLowerCase());
          return matchesSearch;
        });

        const topicColumns = [
          {
            title: 'Tên chủ đề',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text code>{text}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
          },
          {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color={getTopicTypeColor(type)}>{type}</Tag>,
            filters: [
              { text: 'Thiết bị', value: 'device' },
              { text: 'Cảm biến', value: 'sensor' },
              { text: 'Bộ điều khiển', value: 'actuator' },
              { text: 'Hệ thống', value: 'system' },
            ],
            onFilter: (value, record) => record.type === value,
          },
          {
            title: 'Người đăng ký',
            dataIndex: 'subscribers',
            key: 'subscribers',
            render: (subscribers) => (
              <Badge count={subscribers} style={{ backgroundColor: '#52c41a' }} />
            ),
            sorter: (a, b) => a.subscribers - b.subscribers,
          },
          {
            title: 'Tin nhắn',
            dataIndex: 'messageCount',
            key: 'messageCount',
            render: (count) => <Statistic value={count} valueStyle={{ fontSize: '14px' }} />,
            sorter: (a, b) => a.messageCount - b.messageCount,
          },
          {
            title: 'Tin nhắn cuối',
            dataIndex: 'lastMessage',
            key: 'lastMessage',
            render: (timestamp) => timestamp ? new Date(timestamp).toLocaleString() : 'Chưa có',
            sorter: (a, b) => new Date(a.lastMessage || 0) - new Date(b.lastMessage || 0),
          },
          {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button 
                  size="small" 
                  type="link"
                  onClick={() => {
                    console.log('View topic details:', record.name);
                  }}
                >
                  Xem chi tiết
                </Button>
              </Space>
            ),
          },
        ];

        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>MQTT Topic</span>
                <Space>
                  <Tooltip title="Tự động làm mới mỗi 5 giây">
                    <Switch 
                      checked={autoRefresh} 
                      onChange={setAutoRefresh}
                      checkedChildren="Tự động"
                      unCheckedChildren="Thủ công"
                    />
                  </Tooltip>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    onClick={loadTopics} 
                    loading={loading}
                    size="small"
                  >
                    Làm mới
                  </Button>
                </Space>
              </div>
            }
            className="content-card"
            extra={
              lastRefresh && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <ClockCircleOutlined /> Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
                </Text>
              )
            }
          >
            {/* Topic Statistics */}
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Tổng chủ đề" value={topics.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Topic thiết bị" 
                    value={topics.filter(t => t.type === 'device').length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Topic cảm biến" 
                    value={topics.filter(t => t.type === 'sensor').length}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Tổng tin nhắn" 
                    value={topics.reduce((sum, t) => sum + (t.messageCount || 0), 0)}
                  />
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="Tìm kiếm chủ đề..."
                allowClear
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                onSearch={setTopicSearch}
                style={{ width: '100%' }}
              />
            </div>

            {loading && <Spin style={{ marginTop: 16 }} />}
            
            {filteredTopics.length > 0 ? (
              <Table
                columns={topicColumns}
                dataSource={filteredTopics}
                rowKey="name"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} trong ${total} chủ đề`,
                }}
                size="small"
                scroll={{ x: 800 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Không tìm thấy chủ đề</Text>
                <br />
                <Button type="link" onClick={loadTopics}>
                  Tải chủ đề
                </Button>
              </div>
            )}
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <DesktopOutlined className="logo-icon" />
            <Title level={4} className="logo-title">
              IoT - Nhóm 10
            </Title>
          </div>
          
          <div className="api-status">
            {apiStatus ? (
              <Tag color="green">API Connected</Tag>
            ) : (
              <Tag color="red">API Disconnected</Tag>
            )}
          </div>
        </div>
      </Header>
      
      <Layout className="main-layout">
        <div className="tab-bar">
          <Space size="large">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                type={activeTab === tab.key ? 'primary' : 'default'}
                icon={tab.icon}
                onClick={() => setActiveTab(tab.key)}
                className="tab-button"
              >
                {tab.label}
              </Button>
            ))}
          </Space>
        </div>
        
        <Content className="main-content">
          {error && (
            <Alert
              message="Connection Error"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={testApiConnection}>
                  Retry
                </Button>
              }
            />
          )}
          
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
