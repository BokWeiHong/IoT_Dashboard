import React, { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import chartColors from "./chartColors";

// Helper to keep a rolling history of sensor data
const defaultHistoryLength = 60; // 60 points (e.g., 1 per second for 1 min)

function useSensorHistory(sensorData, historyLength = defaultHistoryLength) {
  const historyRef = useRef([]);
  useEffect(() => {
    if (sensorData && sensorData.timestamp) {
      historyRef.current = [
        ...historyRef.current,
        {
          ...sensorData,
          timestamp: new Date(sensorData.timestamp),
        },
      ].slice(-historyLength);
    }
  }, [sensorData, historyLength]);
  return historyRef.current;
}


export function AllSensorsChart({ sensorData, history }) {
  // Always call the hook, but prefer the prop if provided
  const localHistory = useSensorHistory(sensorData);
  const chartHistory = history && history.length > 0 ? history : localHistory;
  return (
    <Line
      data={{
        labels: chartHistory.map((d) => d.timestamp && new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: "Temperature (°C)",
            data: chartHistory.map((d) => d.temp),
            borderColor: chartColors.red,
            fill: false,
          },
          {
            label: "Humidity (%)",
            data: chartHistory.map((d) => d.humid),
            borderColor: chartColors.blue,
            fill: false,
          },
          {
            label: "Soil",
            data: chartHistory.map((d) => d.soil),
            borderColor: chartColors.green,
            fill: false,
          },
          {
            label: "Rain",
            data: chartHistory.map((d) => d.rain),
            borderColor: chartColors.purple,
            fill: false,
          },
        ],
      }}
      options={{
        responsive: true,
        title: { display: true, text: "All Sensor Data Over Time" },
        scales: {
          xAxes: [{ display: true, scaleLabel: { display: true, labelString: "Time" } }],
          yAxes: [{ display: true, scaleLabel: { display: true, labelString: "Value" } }],
        },
      }}
      height={150}
    />
  );
}


export function SingleSensorChart({ sensorData, label, color, valueKey, history }) {
  // Always call the hook, but prefer the prop if provided
  const localHistory = useSensorHistory(sensorData);
  const chartHistory = history && history.length > 0 ? history : localHistory;
  return (
    <Line
      data={{
        labels: chartHistory.map((d) => d.timestamp && new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label,
            data: chartHistory.map((d) => d[valueKey]),
            borderColor: color,
            fill: false,
          },
        ],
      }}
      options={{
        responsive: true,
        title: { display: true, text: label + " Over Time" },
        scales: {
          xAxes: [{ display: true, scaleLabel: { display: true, labelString: "Time" } }],
          yAxes: [{ display: true, scaleLabel: { display: true, labelString: "Value" } }],
        },
      }}
      height={120}
    />
  );
}
