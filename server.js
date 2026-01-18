require("dotenv").config({ path: "./config.env" });
const express = require("express");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const http = require("http");
const WebSocket = require("ws");
const mqtt = require("mqtt");
const SensorReading = require("./models/SensorReading");
const path = require("path");

// Connect DB
connectDB();

const app = express();

app.use(express.json());

app.use("/api/authenticate", require("./routes/authenticate"));
app.use("/api/authorize", require("./routes/authorize"));
app.use("/api/sensor-history", require("./routes/sensorHistory"));

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, "client/build")));

// The "/*" route is the catch-all for any requests not handled by the API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Error Handler
app.use(errorHandler);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

CLIENTS = [];

// MQTT setup: connect to Mosquitto broker and subscribe to sensor topic
const mqttUrl = process.env.MQTT_URL || "mqtt://localhost:1883";
const mqttTopic = process.env.MQTT_TOPIC || "iot";

const mqttClient = mqtt.connect(mqttUrl);

mqttClient.on("connect", () => {
  console.log(`Connected to MQTT broker at ${mqttUrl}`);
  mqttClient.subscribe(mqttTopic, (err) => {
    if (err) {
      console.error("MQTT subscribe error:", err);
    } else {
      console.log(`Subscribed to MQTT topic: ${mqttTopic}`);
    }
  });
});

mqttClient.on("error", (err) => {
  console.error("MQTT error:", err);
});

// Validate incoming SHM payloads
const validateSHMPayload = (data) => {
  const errors = [];
  if (!data || typeof data !== "object") {
    errors.push("Payload must be a JSON object");
    return { valid: false, errors };
  }

  const { sensor_id, location, telemetry = {}, device_health = {} } = data;

  if (!sensor_id || typeof sensor_id !== "string" || sensor_id.length > 128) {
    errors.push("sensor_id is required and must be a string <= 128 chars");
  }
  if (!location || typeof location !== "string" || location.length > 128) {
    errors.push("location is required and must be a string <= 128 chars");
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const vx = num(telemetry.vibration_x);
  const vy = num(telemetry.vibration_y);
  const vz = num(telemetry.vibration_z);
  const temp = num(telemetry.temperature_c);
  const hum = num(telemetry.humidity_percent);

  if (vx === null || Math.abs(vx) > 50) errors.push("vibration_x must be a finite number within [-50,50]");
  if (vy === null || Math.abs(vy) > 50) errors.push("vibration_y must be a finite number within [-50,50]");
  if (vz === null || Math.abs(vz) > 50) errors.push("vibration_z must be a finite number within [-50,50]");

  if (temp === null || temp < -100 || temp > 200) errors.push("temperature_c must be a finite number within [-100,200]");
  if (hum === null || hum < 0 || hum > 100) errors.push("humidity_percent must be a finite number within [0,100]");

  const batt = num(device_health.battery_v);
  const errCode = device_health.error_code;
  if (batt === null || batt < 0 || batt > 20) errors.push("battery_v must be a finite number within [0,20]");
  if (errCode === undefined || errCode === null || typeof errCode !== "number") errors.push("error_code must be a number");

  return { valid: errors.length === 0, errors };
};

// MQTT message handler with validation and sanitization
mqttClient.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log("Received MQTT data:", data);

    // Validate payload
    const validation = validateSHMPayload(data);
    if (!validation.valid) {
      console.error("MQTT data failed validation:", validation.errors, "raw:", data);
      return;
    }

    const { sensor_id, location, timestamp, telemetry = {}, device_health = {} } = data;

    const ts = timestamp ? new Date(timestamp) : new Date();

    // Coerce and sanitize numeric inputs
    const reading = new SensorReading({
      sensorId: String(sensor_id).trim(),
      location: String(location).trim(),
      vibrationX: Number(telemetry.vibration_x),
      vibrationY: Number(telemetry.vibration_y),
      vibrationZ: Number(telemetry.vibration_z),
      temperatureC: Number(telemetry.temperature_c),
      humidityPercent: Number(telemetry.humidity_percent),
      batteryV: Number(device_health.battery_v),
      errorCode: Number(device_health.error_code),
      timestamp: ts,
    });

    console.log("[DEBUG] About to save SHM data to MongoDB. Data:", reading);
    try {
      const saveResult = await reading.save();
      console.log("[SUCCESS] Saved SHM sensor data to MongoDB:", saveResult);
    } catch (saveErr) {
      console.error("[ERROR] Error saving SHM sensor data to MongoDB:", saveErr);
      console.error("[ERROR] Data that failed to save:", reading);
      return;
    }

    const sensorDataToSend = {
      sensorId: reading.sensorId,
      location: reading.location,
      vibrationX: reading.vibrationX,
      vibrationY: reading.vibrationY,
      vibrationZ: reading.vibrationZ,
      temperatureC: reading.temperatureC,
      humidityPercent: reading.humidityPercent,
      batteryV: reading.batteryV,
      errorCode: reading.errorCode,
      timestamp: reading.timestamp.getTime(),
    };

    if (CLIENTS.length > 0) {
      for (let i = 0; i < CLIENTS.length; i++) {
        try {
          CLIENTS[i].send(JSON.stringify(sensorDataToSend));
        } catch (err) {
          console.error("Error sending SHM data to client:", err);
        }
      }
    }
  } catch (err) {
    console.error("Error handling MQTT message:", err, message.toString());
  }
});

wss.on("connection", function connection(ws) {
  console.log("New Device Connected!");

  ws.on("message", (data) => {
    console.log(data, typeof data);
    var jsonData = {};
    try {
      jsonData = JSON.parse(data);
      ws.type = jsonData.type;
    } catch (error) {
      console.log(`Parse Error: ${error}`);
    }

    if (jsonData.type === "CLIENT") {
      CLIENTS.push(ws);
    }
    if (jsonData.type === "SENSOR") {
      if (CLIENTS.length > 0) {
        for (let i = 0; i < CLIENTS.length; i++) {
          CLIENTS[i].send(JSON.stringify(jsonData.sensorData));
        }
      }
    }
  });

  ws.on("close", () => {
    console.log(`${ws.type} Disconnected!`);
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const serverListener = server.listen(PORT, HOST, () =>
  console.log(`Server running on http://${HOST}:${PORT}`)
);

process.on("unhandledRejection", (err, promise) => {
  console.log(`Logged Error: ${err}`);
  serverListener.close(() => process.exit(1));
});
