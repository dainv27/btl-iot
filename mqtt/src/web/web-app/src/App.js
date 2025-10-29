import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, Space, Row, Col, Statistic, Tag, Spin, Alert, Switch, Tooltip, Badge, Divider, Select, Input, Table, Timeline, Form, InputNumber, Switch as AntSwitch, message } from 'antd';
import { DesktopOutlined, ControlOutlined, FileTextOutlined, SendOutlined, ReloadOutlined, ClockCircleOutlined, WifiOutlined, WifiOutlined as WifiOffOutlined, SearchOutlined, FilterOutlined, SendOutlined as SendIcon } from '@ant-design/icons';
import axios from 'axios';
import DeviceChart from './components/DeviceChart';
import { WebSocketProvider, useRealtimeData } from './contexts/WebSocketContext';
import './App.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const AppContent = () => {
  // WebSocket real-time data
  const { devices, logs, topics, connectionStatus, isConnected } = useRealtimeData();
  
  // State management
  const [activeTab, setActiveTab] = useState('devices');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Filter states
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  
  // Control tab states
  const [selectedDevice, setSelectedDevice] = useState('');
  const [commandTopic, setCommandTopic] = useState('');
  const [commandData, setCommandData] = useState('');
  const [sendingCommand, setSendingCommand] = useState(false);
  
  // Chart states
  const [chartSelectedDevice, setChartSelectedDevice] = useState('');
  
  const refreshIntervalRef = useRef(null);

  // Test API connection and load data on mount
  useEffect(() => {
    testApiConnection();
    loadDevices();
    loadLogs();
    loadTopics();
  }, []);

  // Auto-refresh effect
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const testApiConnection = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/status');
      setApiStatus(response.data);
      setError(null);
    } catch (err) {
      setError('Cannot connect to API server. Please make sure the web server is running on port 3001.');
      console.error('API connection error:', err);
    }
  };

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/devices');
      setDevices(response.data.devices || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load devices');
      console.error('Load devices error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (logLevelFilter) params.append('level', logLevelFilter);
      if (deviceFilter) params.append('deviceId', deviceFilter);
      params.append('limit', '50');
      
      const response = await axios.get(`http://localhost:3001/api/logs?${params}`);
      setLogs(response.data.logs || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load logs');
      console.error('Load logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/topics');
      setTopics(response.data.topics || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load topics');
      console.error('Load topics error:', err);
    } finally {
      setLoading(false);
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
    if (!selectedDevice) {
      message.error('Please select a device');
      return;
    }
    
    if (!commandTopic) {
      message.error('Please enter a topic');
      return;
    }
    
    if (!commandData) {
      message.error('Please enter command data');
      return;
    }
    
    setSendingCommand(true);
    
    try {
      // Parse JSON data if it's a string
      let parsedData;
      try {
        parsedData = JSON.parse(commandData);
      } catch (e) {
        // If not valid JSON, treat as plain text
        parsedData = commandData;
      }
      
      const response = await axios.post(`http://localhost:3001/api/devices/${selectedDevice}/command`, {
        topic: commandTopic,
        data: parsedData,
        qos: 0,
        retain: false
      });
      
      if (response.data.success) {
        message.success(`Command sent successfully to ${selectedDevice}`);
        console.log('Command sent:', response.data);
        
        // Clear form
        setCommandData('');
        
        // Refresh logs to show the sent command
        loadLogs();
      } else {
        message.error('Failed to send command');
      }
    } catch (error) {
      console.error('Send command error:', error);
      if (error.response?.data?.error) {
        message.error(`Error: ${error.response.data.error}`);
      } else {
        message.error('Failed to send command');
      }
    } finally {
      setSendingCommand(false);
    }
  };

  const presetTopics = [
    'iot/device/command',
    'iot/actuator/control',
    'iot/device/status',
    'iot/device/heartbeat'
  ];

  const tabs = [
    { key: 'devices', label: 'Devices', icon: <DesktopOutlined /> },
    { key: 'control', label: 'Control', icon: <ControlOutlined /> },
    { key: 'logs', label: 'Logs', icon: <FileTextOutlined /> },
    { key: 'topics', label: 'Topics', icon: <SendOutlined /> }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'devices':
        return (
          <div>
            {/* Device Chart Section */}
            <Card 
              title="📊 Biểu đồ dữ liệu thiết bị"
              style={{ marginBottom: 16 }}
              extra={
                <Select
                  placeholder="Chọn thiết bị để xem biểu đồ"
                  style={{ width: 300 }}
                  value={chartSelectedDevice}
                  onChange={setChartSelectedDevice}
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
              }
            >
              <DeviceChart 
                selectedDevice={chartSelectedDevice} 
                refreshInterval={refreshInterval}
              />
            </Card>

            {/* Device Management Section */}
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
                    <ClockCircleOutlined /> Last updated: {lastRefresh.toLocaleTimeString()}
                  </Text>
                )
              }
            >
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Total Devices" value={devices.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Online" 
                    value={devices.filter(d => d.status === 'online').length}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Offline" 
                    value={devices.filter(d => d.status === 'offline').length}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Messages" 
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
                        {device.status}
                      </Tag>
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">Type:</Text>
                            <br />
                            <Tag color="blue">{device.deviceType}</Tag>
                          </div>
                          
                          <div>
                            <Text type="secondary">Location:</Text>
                            <br />
                            <Text>{device.location}</Text>
                          </div>
                          
                          <div>
                            <Text type="secondary">Firmware:</Text>
                            <br />
                            <Text code>{device.firmware}</Text>
                          </div>
                          
                          <div>
                            <Text type="secondary">Capabilities:</Text>
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
                                title="Uptime" 
                                value={formatUptime(device.uptime || 0)}
                                valueStyle={{ fontSize: '12px' }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic 
                                title="Messages" 
                                value={device.messageCount || 0}
                                valueStyle={{ fontSize: '12px' }}
                              />
                            </Col>
                          </Row>
                          
                          <div>
                            <Text type="secondary">Memory:</Text>
                            <br />
                            <Text style={{ fontSize: '12px' }}>
                              {formatMemory(device.memory?.heapUsed || 0)} / {formatMemory(device.memory?.heapTotal || 0)}
                            </Text>
                          </div>
                          
                          {device.lastSensorData && (
                            <div>
                              <Text type="secondary">Last Data:</Text>
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
                              Last seen: {new Date(device.lastSeen).toLocaleString()}
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
                <Text type="secondary">No devices found</Text>
                <br />
                <Button type="link" onClick={loadDevices}>
                  Load Devices
                </Button>
              </div>
            )}
          </Card>
          </div>
        );
      case 'control':
        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Device Control</span>
                <Space>
                  <Tag color={apiStatus?.mqtt?.connected ? 'green' : 'red'}>
                    MQTT {apiStatus?.mqtt?.connected ? 'Connected' : 'Disconnected'}
                  </Tag>
                </Space>
              </div>
            }
            className="content-card"
          >
            <Row gutter={24}>
              {/* Command Form */}
              <Col xs={24} lg={18}>
                <Card title="Send Command" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Device Selection */}
                    <div>
                      <Text strong>Target Device:</Text>
                      <Select
                        placeholder="Select a device"
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

                    {/* Topic Selection */}
                    <div>
                      <Text strong>Topic:</Text>
                      <Select
                        placeholder="Select or enter topic"
                        style={{ width: '100%', marginTop: 8 }}
                        value={commandTopic}
                        onChange={(value) => {
                          // Auto-generate topic with device_id for sensor ctl
                          if (value === 'iot/sensor/ctl' && selectedDevice) {
                            setCommandTopic(`iot/sensor/ctl/${selectedDevice}`);
                          } else {
                            setCommandTopic(value);
                          }
                        }}
                        showSearch
                        allowClear
                        mode="combobox"
                        options={presetTopics.map(topic => ({
                          value: topic,
                          label: topic
                        }))}
                      />
                      {selectedDevice && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            💡 For sensor control, use: iot/sensor/ctl/{selectedDevice}
                          </Text>
                        </div>
                      )}
                    </div>

                    {/* Command Data */}
                    <div>
                      <Text strong>Command Data (JSON):</Text>
                      <Input.TextArea
                        placeholder='{"action": "restart", "timestamp": "2024-01-01T00:00:00.000Z"}'
                        value={commandData}
                        onChange={(e) => setCommandData(e.target.value)}
                        rows={6}
                        style={{ marginTop: 8 }}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Enter JSON data or plain text.
                      </Text>
                    </div>

                    {/* Send Button */}
                    <Button
                      type="primary"
                      icon={<SendIcon />}
                      onClick={sendCommand}
                      loading={sendingCommand}
                      disabled={!selectedDevice || !commandTopic || !commandData}
                      size="large"
                      style={{ width: '100%' }}
                    >
                      Send Command
                    </Button>
                  </Space>
                </Card>
              </Col>

              {/* Connection Status */}
              <Col xs={24} lg={6}>
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
                <span>System Logs</span>
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
                    onClick={loadLogs} 
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
                  <ClockCircleOutlined /> Last updated: {lastRefresh.toLocaleTimeString()}
                </Text>
              )
            }
          >
            {/* Log Statistics */}
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Total Logs" value={logs.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Errors" 
                    value={logs.filter(l => l.level === 'error').length}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Warnings" 
                    value={logs.filter(l => l.level === 'warning').length}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Info" 
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
                    placeholder="Filter by Level"
                    allowClear
                    style={{ width: '100%' }}
                    value={logLevelFilter}
                    onChange={setLogLevelFilter}
                  >
                    <Option value="error">Error</Option>
                    <Option value="warning">Warning</Option>
                    <Option value="info">Info</Option>
                    <Option value="debug">Debug</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Select
                    placeholder="Filter by Device"
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
                    placeholder="Search logs..."
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
                <Text type="secondary">No logs found</Text>
                <br />
                <Button type="link" onClick={loadLogs}>
                  Load Logs
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
            title: 'Topic Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text code>{text}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
          },
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color={getTopicTypeColor(type)}>{type}</Tag>,
            filters: [
              { text: 'Device', value: 'device' },
              { text: 'Sensor', value: 'sensor' },
              { text: 'Actuator', value: 'actuator' },
              { text: 'System', value: 'system' },
            ],
            onFilter: (value, record) => record.type === value,
          },
          {
            title: 'Subscribers',
            dataIndex: 'subscribers',
            key: 'subscribers',
            render: (subscribers) => (
              <Badge count={subscribers} style={{ backgroundColor: '#52c41a' }} />
            ),
            sorter: (a, b) => a.subscribers - b.subscribers,
          },
          {
            title: 'Messages',
            dataIndex: 'messageCount',
            key: 'messageCount',
            render: (count) => <Statistic value={count} valueStyle={{ fontSize: '14px' }} />,
            sorter: (a, b) => a.messageCount - b.messageCount,
          },
          {
            title: 'Last Message',
            dataIndex: 'lastMessage',
            key: 'lastMessage',
            render: (timestamp) => timestamp ? new Date(timestamp).toLocaleString() : 'Never',
            sorter: (a, b) => new Date(a.lastMessage || 0) - new Date(b.lastMessage || 0),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button 
                  size="small" 
                  type="link"
                  onClick={() => {
                    // TODO: Implement topic details modal
                    console.log('View topic details:', record.name);
                  }}
                >
                  View Details
                </Button>
              </Space>
            ),
          },
        ];

        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>MQTT Topics</span>
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
                    onClick={loadTopics} 
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
                  <ClockCircleOutlined /> Last updated: {lastRefresh.toLocaleTimeString()}
                </Text>
              )
            }
          >
            {/* Topic Statistics */}
            <div className="device-stats">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Total Topics" value={topics.length} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Device Topics" 
                    value={topics.filter(t => t.type === 'device').length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Sensor Topics" 
                    value={topics.filter(t => t.type === 'sensor').length}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Total Messages" 
                    value={topics.reduce((sum, t) => sum + (t.messageCount || 0), 0)}
                  />
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="Search topics..."
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
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} topics`,
                }}
                size="small"
                scroll={{ x: 800 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">No topics found</Text>
                <br />
                <Button type="link" onClick={loadTopics}>
                  Load Topics
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
              IoT Device Management
            </Title>
          </div>
          
          <div className="api-status">
            <Space>
              {apiStatus ? (
                <Tag color="green">API Connected</Tag>
              ) : (
                <Tag color="red">API Disconnected</Tag>
              )}
              <Tag color={isConnected ? 'green' : 'red'}>
                WebSocket {isConnected ? 'Connected' : 'Disconnected'}
              </Tag>
            </Space>
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
};

const App = () => {
  return (
    <WebSocketProvider>
      <AppContent />
    </WebSocketProvider>
  );
};

export default App;
