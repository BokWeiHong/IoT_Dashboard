import React from "react";

export default function SensorDataTable({ data }) {
  if (!data || data.length === 0) return <div>No data available.</div>;

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #ddd",
  };

  const headerCellStyle = {
    border: "1px solid #ddd",
    padding: "8px 10px",
    textAlign: "left",
    background: "#f7f7f7",
    whiteSpace: "nowrap",
  }; 

  const cellStyle = {
    border: "1px solid #ddd",
    padding: "8px 10px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto", marginTop: 20 }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Timestamp</th>
            <th style={headerCellStyle}>Sensor ID</th>
            <th style={headerCellStyle}>Location</th>
            <th style={headerCellStyle}>Vib X (g)</th>
            <th style={headerCellStyle}>Vib Y (g)</th>
            <th style={headerCellStyle}>Vib Z (g)</th>
            <th style={headerCellStyle}>Temp (°C)</th>
            <th style={headerCellStyle}>Humidity (%)</th>
            <th style={headerCellStyle}>Battery (V)</th>
            <th style={headerCellStyle}>Error Code</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row._id || idx}>
              <td style={cellStyle}>{row.timestamp ? new Date(row.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }) : "-"}</td>
              <td style={cellStyle}>{row.sensorId || "-"}</td>
              <td style={cellStyle}>{row.location || "-"}</td>
              <td style={cellStyle}>{typeof row.vibrationX === "number" ? row.vibrationX.toFixed(4) : row.vibrationX}</td>
              <td style={cellStyle}>{typeof row.vibrationY === "number" ? row.vibrationY.toFixed(4) : row.vibrationY}</td>
              <td style={cellStyle}>{typeof row.vibrationZ === "number" ? row.vibrationZ.toFixed(4) : row.vibrationZ}</td>
              <td style={cellStyle}>{typeof row.temperatureC === "number" ? row.temperatureC.toFixed(2) : row.temperatureC}</td>
              <td style={cellStyle}>{typeof row.humidityPercent === "number" ? row.humidityPercent.toFixed(2) : row.humidityPercent}</td>
              <td style={cellStyle}>{typeof row.batteryV === "number" ? row.batteryV.toFixed(2) : row.batteryV}</td>
              <td style={cellStyle}>{row.errorCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
