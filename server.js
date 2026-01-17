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

mqttClient.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log("Received MQTT data:", data);

    // Expecting SHM payload structure from edge node
    // {
    //   sensor_id: string,
    //   location: string,
    //   timestamp: string | number,
    //   telemetry: {
    //     vibration_x, vibration_y, vibration_z,
    //     temperature_c, humidity_percent
    //   },
    //   device_health: { battery_v, error_code }
    // }

    const { sensor_id, location, timestamp, telemetry = {}, device_health = {} } = data;

    const requiredTopLevel = ["sensor_id", "location"]; // timestamp is optional (we'll default)
    const missingTopLevel = requiredTopLevel.filter((f) => data[f] === undefined || data[f] === null);

    const requiredTelemetry = [
      "vibration_x",
      "vibration_y",
      "vibration_z",
      "temperature_c",
      "humidity_percent",
    ];
    const missingTelemetry = requiredTelemetry.filter((f) => telemetry[f] === undefined || telemetry[f] === null);

    const requiredHealth = ["battery_v", "error_code"];
    const missingHealth = requiredHealth.filter((f) => device_health[f] === undefined || device_health[f] === null);

    if (missingTopLevel.length || missingTelemetry.length || missingHealth.length) {
      console.error("MQTT data missing required SHM fields:", {
        missingTopLevel,
        missingTelemetry,
        missingHealth,
        data,
      });
      return;
    }

    const ts = timestamp ? new Date(timestamp) : new Date();

    const reading = new SensorReading({
      sensorId: sensor_id,
      location,
      vibrationX: telemetry.vibration_x,
      vibrationY: telemetry.vibration_y,
      vibrationZ: telemetry.vibration_z,
      temperatureC: telemetry.temperature_c,
      humidityPercent: telemetry.humidity_percent,
      batteryV: device_health.battery_v,
      errorCode: device_health.error_code,
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
