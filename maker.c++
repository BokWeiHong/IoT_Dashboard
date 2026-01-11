#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"
// ======================= 1. PIN & SENSOR CONFIGURATION =======================
#define VP_ENABLE_PIN 11  // CRITICAL: Turns on power for Maker Ports
#define DHTPIN 21         // User defined Pin (Ensure this matches your wiring!)
#define SOIL_PIN 10       // "A0" Header
#define RAIN_PIN 4        // Left Maker Port
#define RELAY_PIN 39      // Relay Pin
#define DHTTYPE DHT11


// ======================= 2. CALIBRATION THRESHOLDS =======================
// Adjust these based on your tests!
const int SOIL_DRY_THRESHOLD = 2700; // Value ABOVE this = DRY (Needs Water)
const int RAIN_DRY_THRESHOLD = 4000; // Value ABOVE this = NOT RAINING


// ======================= 3. WIFI & MQTT CONFIGURATION =======================
const char* WIFI_SSID = "GalaxyA54";      
const char* WIFI_PASSWORD = "syuscd7c";


const char* MQTT_SERVER = "34.126.102.91";
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "iot";
const char* DEVICE_ID = "MakerFeatherS3_01"; // Device ID for JSON


// ======================= 4. OBJECTS & VARIABLES =======================
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);


char msg_buffer[256];


// ======================= 5. SETUP FUNCTIONS =======================


void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);


  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);


  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}


void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "MakerFeatherClient-" + String(random(0xffff), HEX);


    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.publish(MQTT_TOPIC, "{\"status\":\"Reconnected\"}");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}


void setup() {
  Serial.begin(115200);
  while (!Serial) { delay(10); }


  Serial.println("\n--- MakerFeather AIoT System Starting ---");


  // Power up Sensors
  pinMode(VP_ENABLE_PIN, OUTPUT);
  digitalWrite(VP_ENABLE_PIN, HIGH);
  delay(100);


  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start Pump OFF


  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
}


// ======================= 6. MAIN LOOP =======================


void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();


  // --- READ SENSORS ---
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int soilValue = analogRead(SOIL_PIN);
  int rainValue = analogRead(RAIN_PIN);


  // Safety Check: Detect Sensor Failure
  bool sensorsValid = true;
  if (isnan(h) || isnan(t) || h == 0 || t == 0) {
    Serial.println("Error: DHT Sensor Invalid Reading!");
    sensorsValid = false;
    h = 0.0; t = 0.0; // Prevent bad logic
  }


  // --- PUMP LOGIC ---
  String pumpState = "OFF";
  bool turnPumpOn = false;


  if (sensorsValid) {
    // RULE 1: Soil is Dry AND It is NOT Raining
    // (High Soil Value = Dry)
    if (soilValue > SOIL_DRY_THRESHOLD && rainValue > RAIN_DRY_THRESHOLD) {
      turnPumpOn = true;
      Serial.println("[LOGIC] Soil Dry & No Rain -> PUMP ON");
    }
    // RULE 2: High Temp (>31) OR Low Humidity (<50)
    // (Evaporation is high, plants need water)
    else if (t > 31.0 || h < 50.0) {
      turnPumpOn = true;
      Serial.println("[LOGIC] Hot & Dry Air -> PUMP ON");
    }
  }
 // ---  PUMP LOGIC (2-SECOND PULSE) ---
  if (turnPumpOn) {
    Serial.println("Action: Starting 2-second watering cycle...");
    digitalWrite(RELAY_PIN, HIGH);  // Turn pump ON
    pumpState = "ON";
   
    // Publish ON state immediately so MQTT reflects the start
    snprintf(msg_buffer, sizeof(msg_buffer),
             "{\"deviceId\":\"%s\", \"temp\":%.2f, \"humid\":%.2f, \"soil\":%d, \"rain\":%d, \"pump\":\"ON\"}",
             DEVICE_ID, t, h, soilValue, rainValue);
    client.publish(MQTT_TOPIC, msg_buffer);
    delay(2000);                    // Wait for 2 seconds
    digitalWrite(RELAY_PIN, LOW);   // Turn pump OFF
    pumpState = "OFF";
    Serial.println("Action: Watering cycle complete.");
    // Prevent immediate re-triggering
    // This gives the water time to soak into the soil
    Serial.println("Cooldown: Waiting 10 seconds before next check...");
    delay(10000);
  } else {
    digitalWrite(RELAY_PIN, LOW);
    pumpState = "OFF";
  }
  // --- JSON PAYLOAD ---
  // Added "deviceId" as requested
  snprintf(msg_buffer, sizeof(msg_buffer),
           "{\"deviceId\":\"%s\", \"temp\":%.2f, \"humid\":%.2f, \"soil\":%d, \"rain\":%d, \"pump\":\"%s\"}",
           DEVICE_ID, t, h, soilValue, rainValue, pumpState.c_str());
  Serial.print("Publishing: ");
  Serial.println(msg_buffer);
  client.publish(MQTT_TOPIC, msg_buffer);
  delay(2000);
}
