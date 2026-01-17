// SHM MQTT publisher - Scenario 2: dangerous/critical data
// Simulates structural stress, device faults, and environmental extremes

const mqtt = require("mqtt");

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "iot";

// You can adjust these IDs/locations or override via env
const SENSOR_ID = process.env.SHM_SENSOR_ID || "shm-node-beta-02";
const LOCATION = process.env.SHM_LOCATION || "bridge-span-central";

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log(`[SHM Scenario2-DANGER] Connected to MQTT broker at ${MQTT_URL}, topic '${MQTT_TOPIC}'`);

  // Publish dangerous data every 2 seconds
  setInterval(() => {
    const now = new Date();

    // DANGEROUS: High vibrations indicating structural stress/resonance
    const vibration_x = (Math.random() - 0.5) * 0.8 + 0.4; // 0..0.8g (very high)
    const vibration_y = (Math.random() - 0.5) * 0.6 + 0.3; // 0..0.6g (high)
    const vibration_z = 1.0 + (Math.random() - 0.5) * 1.2; // 0.4..1.6g (erratic)

    // EXTREME environmental conditions
    const temperature_c = Math.random() > 0.5 
      ? -10 + (Math.random() * 5)        // Freezing: -10 to -5°C
      : 55 + (Math.random() * 10);       // Or overheating: 55 to 65°C
    
    const humidity_percent = Math.random() > 0.5
      ? 5 + (Math.random() * 10)         // Very dry: 5-15%
      : 90 + (Math.random() * 10);       // Or very humid: 90-100%

    // CRITICAL device health issues
    const battery_v = 2.8 + (Math.random() * 0.4); // Low battery: 2.8-3.2V (critical)
    const error_code = Math.floor(Math.random() * 4) + 1; // Random error: 1-4

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
        console.error("[SHM Scenario2-DANGER] Publish error:", err);
      } else {
        console.log("[SHM Scenario2-DANGER] Published CRITICAL DATA:", json);
      }
    });
  }, 2000);
});

client.on("error", (err) => {
  console.error("[SHM Scenario2-DANGER] MQTT error:", err);
});