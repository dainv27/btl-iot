import React, { useState, useEffect } from 'react';
import { Card, Select, Row, Col, Statistic, Tag, Spin, Alert } from 'antd';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { Option } = Select;

const DeviceChart = ({ selectedDevice, refreshInterval = 5000 }) => {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [currentValues, setCurrentValues] = useState({});

  // Load sensor data for selected device
  const loadSensorData = async () => {
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/sensor-data/${selectedDevice}`);
      const data = response.data;
      
      if (data && data.length > 0) {
        setSensorData(data);
        processChartData(data);
        updateCurrentValues(data);
      } else {
        setSensorData([]);
        setChartData(null);
        setCurrentValues({});
      }
      setError(null);
    } catch (err) {
      console.error('Error loading sensor data:', err);
      setError('Failed to load sensor data');
    } finally {
      setLoading(false);
    }
  };

  // Process data for chart display
  const processChartData = (data) => {
    if (!data || data.length === 0) return;

    // Get the latest data point
    const latestData = data[0];
    const sensors = latestData.data?.sensors || {};

    // Prepare datasets for each sensor type
    const datasets = [];
    const labels = [];
    const colors = {
      temperature: '#ff6b6b',
      humidity: '#4ecdc4',
      light: '#ffe66d',
      pressure: '#a8e6cf',
      airQuality: '#ff8b94',
      motion: '#c7ceea',
      pir: '#ffb3ba'
    };

    // Generate time labels (last 20 data points)
    const dataPoints = data.slice(0, 20).reverse();
    dataPoints.forEach((point, index) => {
      const time = new Date(point.timestamp);
      labels.push(time.toLocaleTimeString());
    });

    // Create datasets for each sensor
    Object.keys(sensors).forEach(sensorType => {
      const sensor = sensors[sensorType];
      
      if (sensorType === 'motion' || sensorType === 'pir') {
        // Boolean values - show as 0/1
        datasets.push({
          label: getSensorDisplayName(sensorType),
          data: dataPoints.map(point => {
            const value = point.data?.sensors?.[sensorType]?.value || 
                         point.data?.sensors?.[sensorType]?.detected;
            return value === true || value === 1 ? 1 : 0;
          }),
          borderColor: colors[sensorType] || '#8884d8',
          backgroundColor: colors[sensorType] || '#8884d8',
          fill: false,
          tension: 0.1,
          yAxisID: 'y1'
        });
      } else {
        // Numeric values
        datasets.push({
          label: getSensorDisplayName(sensorType),
          data: dataPoints.map(point => {
            const value = point.data?.sensors?.[sensorType]?.value;
            return typeof value === 'number' ? value : 0;
          }),
          borderColor: colors[sensorType] || '#8884d8',
          backgroundColor: colors[sensorType] || '#8884d8',
          fill: false,
          tension: 0.1,
          yAxisID: 'y'
        });
      }
    });

    setChartData({
      labels,
      datasets
    });
  };

  // Update current values display
  const updateCurrentValues = (data) => {
    if (!data || data.length === 0) return;

    const latestData = data[0];
    const sensors = latestData.data?.sensors || {};
    const values = {};

    Object.keys(sensors).forEach(sensorType => {
      const sensor = sensors[sensorType];
      values[sensorType] = {
        value: sensor.value || sensor.detected,
        unit: sensor.unit || '',
        level: sensor.level || ''
      };
    });

    setCurrentValues(values);
  };

  // Get user-friendly sensor display name
  const getSensorDisplayName = (sensorType) => {
    const names = {
      temperature: 'Nhiệt độ',
      humidity: 'Độ ẩm',
      light: 'Ánh sáng',
      pressure: 'Áp suất',
      airQuality: 'Chất lượng không khí',
      motion: 'Chuyển động',
      pir: 'Cảm biến PIR'
    };
    return names[sensorType] || sensorType;
  };

  // Format value for display
  const formatValue = (value, unit, sensorType) => {
    if (sensorType === 'motion' || sensorType === 'pir') {
      return value === true || value === 1 ? 'Có' : 'Không';
    }
    
    if (typeof value === 'number') {
      return `${value.toFixed(1)} ${unit}`;
    }
    
    return `${value} ${unit}`;
  };

  // Get status color for boolean values
  const getStatusColor = (value, sensorType) => {
    if (sensorType === 'motion' || sensorType === 'pir') {
      return value === true || value === 1 ? 'green' : 'red';
    }
    return 'blue';
  };

  // Load data when selectedDevice changes
  useEffect(() => {
    loadSensorData();
  }, [selectedDevice]);

  // Auto-refresh data
  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(() => {
      loadSensorData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [selectedDevice, refreshInterval]);

  if (!selectedDevice) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 0', 
        color: '#8c8c8c',
        fontSize: '14px'
      }}>
        Vui lòng chọn thiết bị để xem biểu đồ dữ liệu
      </div>
    );
  }

  if (loading && sensorData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px 0' }}>
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 0', 
        color: '#8c8c8c',
        fontSize: '14px'
      }}>
        Không có dữ liệu cảm biến cho thiết bị này
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Dữ liệu cảm biến - ${selectedDevice}`,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const sensorType = Object.keys(currentValues).find(key => 
              getSensorDisplayName(key) === label
            );
            
            if (sensorType === 'motion' || sensorType === 'pir') {
              return `${label}: ${value === 1 ? 'Có' : 'Không'}`;
            }
            
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Thời gian'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Giá trị số'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Trạng thái (Có/Không)'
        },
        min: 0,
        max: 1,
        ticks: {
          callback: function(value) {
            return value === 1 ? 'Có' : 'Không';
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div>
      {/* Data Info */}
      <div style={{ 
        marginBottom: 16, 
        textAlign: 'right',
        color: '#8c8c8c',
        fontSize: '12px'
      }}>
        <Tag color="blue">
          {sensorData.length} điểm dữ liệu
        </Tag>
      </div>

      {/* Current Values Display */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {Object.keys(currentValues).map(sensorType => {
          const { value, unit, level } = currentValues[sensorType];
          const displayName = getSensorDisplayName(sensorType);
          const formattedValue = formatValue(value, unit, sensorType);
          const statusColor = getStatusColor(value, sensorType);
          
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={sensorType}>
              <Card size="small">
                <Statistic
                  title={displayName}
                  value={formattedValue}
                  valueStyle={{ 
                    color: statusColor === 'green' ? '#52c41a' : 
                           statusColor === 'red' ? '#ff4d4f' : '#1890ff'
                  }}
                />
                {level && (
                  <Tag color="blue" style={{ marginTop: 8 }}>
                    {level}
                  </Tag>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Chart Display */}
      <div style={{ height: '400px', position: 'relative' }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Spin />
        </div>
      )}
    </div>
  );
};

export default DeviceChart;
