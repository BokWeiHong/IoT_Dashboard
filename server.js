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

    // Log received MQTT data for debugging
    console.log("Received MQTT data:", data);

    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    const reading = new SensorReading({
      deviceId: data.deviceId,
      temp: data.temp,
      humid: data.humid,
      soil: data.soil,
      rain: data.rain,
      pump: data.pump,
      timestamp: new Date(data.timestamp),
    });

    await reading.save();

    const sensorDataToSend = {
      deviceId: reading.deviceId,
      temp: reading.temp,
      humid: reading.humid,
      soil: reading.soil,
      rain: reading.rain,
      pump: reading.pump,
      timestamp: reading.timestamp.getTime(),
    };

    if (CLIENTS.length > 0) {
      for (let i = 0; i < CLIENTS.length; i++) {
        try {
          CLIENTS[i].send(JSON.stringify(sensorDataToSend));
        } catch (err) {
          console.error("Error sending data to client:", err);
        }
      }
    }
  } catch (err) {
    console.error("Error handling MQTT message:", err);
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
