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
            <th style={headerCellStyle}>Device ID</th>
            <th style={headerCellStyle}>Temp (C)</th>
            <th style={headerCellStyle}>Humid (%)</th>
            <th style={headerCellStyle}>Soil</th>
            <th style={headerCellStyle}>Rain</th>
            <th style={headerCellStyle}>Pump</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row._id || idx}>
              <td style={cellStyle}>{row.timestamp ? new Date(row.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }) : "-"}</td>
              <td style={cellStyle}>{row.deviceId || "-"}</td>
              <td style={cellStyle}>{row.temp}</td>
              <td style={cellStyle}>{row.humid}</td>
              <td style={cellStyle}>{row.soil}</td>
              <td style={cellStyle}>{row.rain}</td>
              <td style={cellStyle}>{row.pump}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
