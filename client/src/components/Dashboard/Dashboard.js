import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Dashboard.css";
import Navbar from "../NavBar/NavBar";
import { AllSensorsChart, SingleSensorChart } from "../Sensor/MultiSensorCharts";
import SensorDataTable from "./SensorDataTable";
import chartColors from "../Sensor/chartColors";

const Dashboard = ({ history }) => {
  const [error, setError] = useState("");
  const [sensorHistory, setSensorHistory] = useState([]); // Array of SHM sensor readings
  const [selectedSensorId, setSelectedSensorId] = useState("");
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
        console.log("Received SHM sensorData:", parsed);
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

  // Get unique sensor IDs from history
  const sensorIds = Array.from(new Set(sensorHistory.map(d => d.sensorId).filter(Boolean)));
  // Filter history by selected sensorId (if any)
  const filteredHistory = selectedSensorId
    ? sensorHistory.filter(d => d.sensorId === selectedSensorId)
    : sensorHistory;

  // Calculate min, max, avg for each metric in filteredHistory
  const getStats = (arr, key, decimals = 2) => {
    if (!arr.length) return { min: "-", max: "-", avg: "-" };
    const values = arr.map(d => d[key]).filter(v => typeof v === "number");
    if (!values.length) return { min: "-", max: "-", avg: "-" };
    const min = Math.min(...values).toFixed(decimals);
    const max = Math.max(...values).toFixed(decimals);
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(decimals);
    return { min, max, avg };
  };

  const stats = {
    vibrationX: getStats(filteredHistory, "vibrationX", 4),
    vibrationY: getStats(filteredHistory, "vibrationY", 4),
    vibrationZ: getStats(filteredHistory, "vibrationZ", 4),
    temperatureC: getStats(filteredHistory, "temperatureC", 2),
    humidityPercent: getStats(filteredHistory, "humidityPercent", 2),
    batteryV: getStats(filteredHistory, "batteryV", 2),
  };

  // Get latest sensor data for current status
  const latestData = filteredHistory[filteredHistory.length - 1] || {};
  const {
    vibrationX = 0,
    vibrationY = 0,
    vibrationZ = 0,
    temperatureC = 0,
    humidityPercent = 0,
    batteryV = 0,
    errorCode = 0,
    location,
  } = latestData;

  const tempStatus = temperatureC > 40 ? "HIGH" : temperatureC < 0 ? "LOW" : "NORMAL";
  const humidityStatus = humidityPercent < 30 ? "LOW" : humidityPercent > 80 ? "HIGH" : "NORMAL";
  const batteryStatus = batteryV < 3.4 ? "LOW" : batteryV > 4.1 ? "HIGH" : "NORMAL";
  const nodeHealth = errorCode === 0 ? "OK" : "FAULT";

  // DANGER DETECTION LOGIC
  const isDangerous = 
    Math.abs(vibrationX) > 0.3 || 
    Math.abs(vibrationY) > 0.3 || 
    Math.abs(vibrationZ - 1.0) > 0.4 || // Z should be ~1g (gravity)
    temperatureC < -5 || temperatureC > 50 ||
    humidityPercent < 10 || humidityPercent > 95 ||
    batteryV < 3.0 ||
    errorCode > 0;

  // Alert when dangerous conditions detected
  useEffect(() => {
    if (isDangerous && latestData.sensorId) {
      console.warn("🚨 DANGER DETECTED:", {
        sensor: latestData.sensorId,
        location: latestData.location,
        vibrationX,
        vibrationY,
        vibrationZ,
        temperatureC,
        humidityPercent,
        batteryV,
        errorCode
      });
      
      // Browser notification (if permitted)
      if (Notification.permission === "granted") {
        new Notification("🚨 SHM ALERT", {
          body: `Critical conditions at ${latestData.location || latestData.sensorId}`,
          icon: "/favicon.ico"
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, [isDangerous, latestData.sensorId, vibrationX, vibrationY, vibrationZ, temperatureC, humidityPercent, batteryV, errorCode, latestData.location]);

  return error ? (
    <span className="error-message">{error}</span>
  ) : (
    <>
      <Navbar history={history} />
      <div className="data">
        {/* DANGER ALERT BANNER */}
        {isDangerous && (
          <div style={{ 
            background: "linear-gradient(45deg, #ff4444, #cc0000)", 
            color: "white", 
            padding: "15px 20px", 
            marginBottom: "20px", 
            borderRadius: "8px", 
            fontWeight: "bold", 
            fontSize: "18px",
            textAlign: "center",
            border: "3px solid #990000",
            boxShadow: "0 4px 12px rgba(255, 0, 0, 0.3)",
            animation: "pulse 2s infinite"
          }}>
            🚨 CRITICAL ALERT: Dangerous conditions detected at {latestData.location || latestData.sensorId} 🚨
            <style>{`
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
              }
            `}</style>
          </div>
        )}
        {/* Summary Cards for SHM metrics */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "nowrap" }}>
          {Object.entries(stats).map(([key, val]) => {
            const getIcon = (type) => {
              switch(type) {
                case 'vibrationX':
                case 'vibrationY':
                case 'vibrationZ':
                  return '📈';
                case 'temperatureC': return '🌡️';
                case 'humidityPercent': return '💧';
                case 'batteryV': return '🔋';
                default: return '';
              }
            };
            return (
              <div key={key} style={{ background: "#fff", boxShadow: "0 2px 8px #eee", borderRadius: 6, padding: 12, flex: 1, textAlign: 'center' }}>
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
        {/* Status Indicators for node health */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Node Health Indicator */}
          <div style={{ background: nodeHealth === 'OK' ? '#e3f7e3' : '#f7e3e3', border: `1px solid ${nodeHealth === 'OK' ? '#b2dfb2' : '#dfb2b2'}`, borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>🏗️</span>
            <span style={{ fontWeight: 700 }}>Node Health:</span>
            <span style={{ color: nodeHealth === 'OK' ? 'green' : 'red', fontWeight: 700 }}>{nodeHealth}</span>
            <span style={{ fontSize: 12 }}>({isDangerous ? "⚠️ CRITICAL" : `errorCode: ${errorCode}`})</span>
          </div>
          {/* Temperature Status */}
          <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f1', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>🌡️</span>
            <span style={{ fontWeight: 700 }}>Temp:</span>
            <span style={{ fontWeight: 700 }}>{temperatureC.toFixed(2)}°C</span>
            <span style={{ color: tempStatus === 'HIGH' ? 'red' : tempStatus === 'LOW' ? 'blue' : 'green', fontSize: 12 }}>({tempStatus})</span>
          </div>
          {/* Humidity Status */}
          <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f1', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>💧</span>
            <span style={{ fontWeight: 700 }}>Humidity:</span>
            <span style={{ fontWeight: 700 }}>{humidityPercent.toFixed(2)}%</span>
            <span style={{ color: humidityStatus === 'LOW' ? 'orange' : humidityStatus === 'HIGH' ? 'blue' : 'green', fontSize: 12 }}>({humidityStatus})</span>
          </div>
          {/* Battery Status */}
          <div style={{ background: '#fff7e3', border: '1px solid #dfdfb2', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 18 }}>🔋</span>
            <span style={{ fontWeight: 700 }}>Battery:</span>
            <span style={{ fontWeight: 700 }}>{batteryV.toFixed(2)} V</span>
            <span style={{ color: batteryStatus === 'LOW' ? 'red' : batteryStatus === 'HIGH' ? 'orange' : 'green', fontSize: 12 }}>({batteryStatus})</span>
          </div>
        </div>
        {/* Sensor ID Filter */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="sensorIdFilter">Filter by Sensor ID: </label>
          <select
            id="sensorIdFilter"
            value={selectedSensorId}
            onChange={e => setSelectedSensorId(e.target.value)}
          >
            <option value="">All Sensors</option>
            {sensorIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        {/* Main graph for all data */}
        <AllSensorsChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} />
        {/* Separate graphs for each metric */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30 }}>
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Vibration X (g)" color={chartColors.red} valueKey="vibrationX" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Vibration Y (g)" color={chartColors.blue} valueKey="vibrationY" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Vibration Z (g)" color={chartColors.green} valueKey="vibrationZ" />
          <SingleSensorChart sensorData={filteredHistory[filteredHistory.length - 1] || {}} history={filteredHistory} label="Temperature (°C)" color={chartColors.purple} valueKey="temperatureC" />
        </div>
        {/* Data Table */}
        <SensorDataTable data={filteredHistory.slice().reverse().slice(0, 20)} />
      </div>
    </>
  );
};

export default Dashboard;
