// Simple SHM MQTT publisher - Scenario 1: normal data
// Uses the same JSON structure expected by server.js

const mqtt = require("mqtt");

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "iot";

// You can adjust these IDs/locations or override via env
const SENSOR_ID = process.env.SHM_SENSOR_ID || "shm-node-alpha-01";
const LOCATION = process.env.SHM_LOCATION || "beam-section-4F";

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log(`[SHM Scenario1] Connected to MQTT broker at ${MQTT_URL}, topic '${MQTT_TOPIC}'`);

  // Publish normal data every 2 seconds
  setInterval(() => {
    const now = new Date();

    // Normal vibration around 0g with small noise
    const vibration_x = (Math.random() - 0.5) * 0.05; // -0.025..0.025
    const vibration_y = (Math.random() - 0.5) * 0.05;
    const vibration_z = 1.0 + (Math.random() - 0.5) * 0.02; // around 1g (gravity)

    // Normal environmental values
    const temperature_c = 28 + (Math.random() - 0.5) * 4; // 26..30 roughly
    const humidity_percent = 60 + (Math.random() - 0.5) * 10; // 55..65

    // Healthy device
    const battery_v = 3.7 + (Math.random() - 0.5) * 0.1; // ~3.65..3.75
    const error_code = 0;

    const payload = {
      sensor_id: SENSOR_ID,
      location: LOCATION,
      timestamp: now.toISOString(),
      telemetry: {
        vibration_x,
        vibration_y,
        vibration_z,
        temperature_c,
        humidity_percent,
      },
      device_health: {
        battery_v,
        error_code,
      },
    };

    const json = JSON.stringify(payload);
    client.publish(MQTT_TOPIC, json, { qos: 0 }, (err) => {
      if (err) {
        console.error("[SHM Scenario1] Publish error:", err);
      } else {
        console.log("[SHM Scenario1] Published:", json);
      }
    });
  }, 2000);
});

client.on("error", (err) => {
  console.error("[SHM Scenario1] MQTT error:", err);
});
