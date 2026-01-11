import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Dashboard.css";
import Navbar from "../NavBar/NavBar";
import { AllSensorsChart, SingleSensorChart } from "../Sensor/MultiSensorCharts";
import SensorDataTable from "./SensorDataTable";
import chartColors from "../Sensor/chartColors";

const Dashboard = ({ history }) => {
  const [error, setError] = useState("");
  const [sensorHistory, setSensorHistory] = useState([]); // Array of sensor readings
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const ws = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      history.push("/login");
    }

    // Fetch sensor history from backend
    const fetchHistory = async () => {
      try {
        const res = await axios.get("/api/sensor-history?limit=100");
        if (res.data && res.data.success) {
          setSensorHistory(res.data.data.map(d => ({ ...d, timestamp: new Date(d.timestamp) })));
        }
      } catch (err) {
        console.error("Failed to fetch sensor history", err);
      }
    };

    fetchHistory();

    const connectWebSocket = () => {
      ws.current = new WebSocket(`ws://${window.location.hostname}:5000`);
      const jsonClientType = {
        type: "CLIENT",
      };

      ws.current.onopen = () => {
        console.log("Connected to Server!");
        ws.current.send(JSON.stringify(jsonClientType));
      };

      ws.current.onerror = (error) => {
        console.log(`Error: ${error}`);
      };

      ws.current.onclose = () => {
        console.log("Disconnected from Server!");
        // Implement Reconnecting Method
      };

      ws.current.onmessage = ({ data }) => {
        const parsed = JSON.parse(data);
        console.log('Received sensorData:', parsed);
        setSensorHistory(prev => ([...prev, { ...parsed, timestamp: new Date(parsed.timestamp) }]).slice(-100));
      };
    };

    const authenticate = async () => {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      };

      try {
        const { data } = await axios.get("/api/authorize", config);
        if (data.data === "ACCESS_GRANTED") {
          connectWebSocket();
        }
      } catch (error) {
        localStorage.removeItem("authToken");
        setError("You are not authorized please login");
        setTimeout(() => {
          history.push("/login");
        }, 3000);
      }
    };

    authenticate();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [history]);

  // Get unique device IDs from history
  const deviceIds = Array.from(new Set(sensorHistory.map(d => d.deviceId).filter(Boolean)));
  // Filter history by selected deviceId (if any)
  const filteredHistory = selectedDeviceId
    ? sensorHistory.filter(d => d.deviceId === selectedDeviceId)
    : sensorHistory;

  // Calculate min, max, avg for each metric in filteredHistory
  const getStats = (arr, key) => {
    if (!arr.length) return { min: "-", max: "-", avg: "-" };
    const values = arr.map(d => d[key]).filter(v => typeof v === "number");
    if (!values.length) return { min: "-", max: "-", avg: "-" };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    return { min, max, avg };
  };

  const stats = {
    temp: getStats(filteredHistory, "temp"),
    humid: getStats(filteredHistory, "humid"),
    soil: getStats(filteredHistory, "soil"),
    rain: getStats(filteredHistory, "rain"),
  };

  // Get latest sensor data for current status
  const latestData = filteredHistory[filteredHistory.length - 1] || {};
  const { temp: currentTemp = 0, humid: currentHumidity = 0, soil: currentSoil = 0, rain: currentRain = 0, pump: mqttPumpStatus } = latestData;

  // Use pump status from MQTT data if available, otherwise calculate based on logic
  const pumpStatus = mqttPumpStatus || "OFF"; // Use MQTT pump status directly
  
  // Define thresholds
  const RAIN_DRY_THRESHOLD = 500; // Adjust based on your sensor
  const isRaining = currentRain <= RAIN_DRY_THRESHOLD;
  const tempStatus = currentTemp > 31 ? "HIGH" : currentTemp < 15 ? "LOW" : "NORMAL";
  const humidityStatus = currentHumidity < 50 ? "LOW" : currentHumidity > 80 ? "HIGH" : "NORMAL";

  return error ? (
    <span className="error-message">{error}</span>
  ) : (
    <>
      <Navbar history={history} />
      <div className="data">
        {/* Summary Cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(stats).map(([key, val]) => {
            const getIcon = (type) => {
              switch(type) {
                case 'temp': return '🌡️';
                case 'humid': return '💧';
                case 'soil': return '🌱';
                case 'rain': return '🌧️';
                default: return '';
              }
            };
            return (
              <div key={key} style={{ background: "#fff", boxShadow: "0 2px 8px #eee", borderRadius: 6, padding: 12, flex: 1, minWidth: 200, textAlign: 'center' }}>
                <div style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{getIcon(key)}</span>
                  {key}
                </div>
                <div>Min: {val.min}</div>
                <div>Max: {val.max}</div>
                <div>Avg: {val.avg}</div>
              </div>
            );
          })}
        </div>
        {/* Status Indicators */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Pump Status Indicator */}
          <div style={{ background: pumpStatus === 'ON' ? '#e3f7e3' : '#f7e3e3', border: `1px solid ${pumpStatus === 'ON' ? '#b2dfb2' : '#dfb2b2'}`, borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span style={{ fontWeight: 700 }}>Pump:</span>
            <span style={{ color: pumpStatus === 'ON' ? 'green' : 'red', fontWeight: 700 }}>{pumpStatus}</span>
          </div>
          {/* Temperature Status */}
          <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f1', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>🌡️</span>
            <span style={{ fontWeight: 700 }}>Temp:</span>
            <span style={{ fontWeight: 700 }}>{currentTemp.toFixed(1)}°C</span>
            <span style={{ color: tempStatus === 'HIGH' ? 'red' : tempStatus === 'LOW' ? 'blue' : 'green', fontSize: 12 }}>({tempStatus})</span>
          </div>
          {/* Humidity Status */}
          <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f1', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>💧</span>
            <span style={{ fontWeight: 700 }}>Humidity:</span>
            <span style={{ fontWeight: 700 }}>{currentHumidity.toFixed(1)}%</span>
            <span style={{ color: humidityStatus === 'LOW' ? 'orange' : humidityStatus === 'HIGH' ? 'blue' : 'green', fontSize: 12 }}>({humidityStatus})</span>
          </div>
          {/* Weather Status */}
          <div style={{ background: isRaining ? '#e3e3f7' : '#fff7e3', border: `1px solid ${isRaining ? '#b2b2df' : '#dfdfb2'}`, borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>{isRaining ? '🌧️' : '☀️'}</span>
            <span style={{ fontWeight: 700 }}>Weather:</span>
            <span style={{ color: isRaining ? 'blue' : 'orange', fontWeight: 700 }}>{isRaining ? 'RAINING' : 'DRY'}</span>
          </div>
        </div>
        {/* Device ID Filter */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="deviceIdFilter">Filter by Device ID: </label>
          <select
            id="deviceIdFilter"
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
          >
            <option value="">All Devices</option>
            {deviceIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        {/* Main graph for all data */}
        <AllSensorsChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} />
        {/* Separate graphs for each metric */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30 }}>
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Temperature (°C)" color={chartColors.red} valueKey="temp" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Humidity (%)" color={chartColors.blue} valueKey="humid" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Soil" color={chartColors.green} valueKey="soil" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Rain" color={chartColors.purple} valueKey="rain" />
        </div>
        {/* Data Table */}
        <SensorDataTable data={filteredHistory.slice().reverse().slice(0, 20)} />
      </div>
    </>
  );
};

export default Dashboard;
