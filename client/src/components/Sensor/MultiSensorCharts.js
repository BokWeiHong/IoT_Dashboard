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
            label: "Vibration X (g)",
            data: chartHistory.map((d) => d.vibrationX),
            borderColor: chartColors.red,
            fill: false,
          },
          {
            label: "Vibration Y (g)",
            data: chartHistory.map((d) => d.vibrationY),
            borderColor: chartColors.blue,
            fill: false,
          },
          {
            label: "Vibration Z (g)",
            data: chartHistory.map((d) => d.vibrationZ),
            borderColor: chartColors.green,
            fill: false,
          },
          {
            label: "Temperature (°C)",
            data: chartHistory.map((d) => d.temperatureC),
            borderColor: chartColors.purple,
            fill: false,
          },
        ],
      }}
      options={{
        responsive: true,
        title: { display: true, text: "Structural Response Over Time" },
        scales: {
          xAxes: [{ display: true, scaleLabel: { display: true, labelString: "Time" } }],
          yAxes: [{
            display: true,
            scaleLabel: { display: true, labelString: "Value" },
            ticks: {
              callback: (value) =>
                typeof value === "number" ? value.toFixed(2) : value,
            },
          }],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || "";
              const value = tooltipItem.yLabel;
              const formatted =
                typeof value === "number" ? value.toFixed(2) : value;
              return label ? `${label}: ${formatted}` : formatted;
            },
          },
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
          yAxes: [{
            display: true,
            scaleLabel: { display: true, labelString: "Value" },
            ticks: {
              callback: (value) =>
                typeof value === "number" ? value.toFixed(2) : value,
            },
          }],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || "";
              const value = tooltipItem.yLabel;
              const formatted =
                typeof value === "number" ? value.toFixed(2) : value;
              return label ? `${label}: ${formatted}` : formatted;
            },
          },
        },
      }}
      height={120}
    />
  );
}
