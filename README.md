# Structural Health Monitoring (SHM) Dashboard

A real-time IoT dashboard for monitoring the structural integrity of buildings, bridges, and critical infrastructure through continuous vibration analysis, environmental monitoring, and device health tracking.

## Overview

The SHM Dashboard is a real-time web application built using ReactJS, NodeJS, ExpressJS, MQTT, and MongoDB. It monitors structural health through sensor networks deployed on critical infrastructure, providing early detection of potential structural issues, environmental stress factors, and system anomalies.

## Architecture

### Backend

- The backend is built with Node.js and Express.js.
- It connects to a MongoDB database to store structural sensor readings.
- It uses the MQTT protocol to receive SHM data from edge nodes deployed on infrastructure.
- When a device publishes SHM data to the MQTT broker (default: `mqtt://localhost:1883`), the backend subscribes to the relevant topic (default: `iot`).
- Upon receiving a message, the backend parses the SHM JSON payload and saves it into MongoDB using the `SensorReading` model.
- The backend also provides a WebSocket server to broadcast real-time structural health data to connected frontend clients.

**SHM Data Structure:**
```json
{
  "sensor_id": "shm-node-alpha-01",
  "location": "beam-section-4F", 
  "timestamp": "2026-01-18T14:45:00.000Z",
  "telemetry": {
    "vibration_x": 0.045,
    "vibration_y": -0.012,
    "vibration_z": 1.002,
    "temperature_c": 32.5,
    "humidity_percent": 65.0
  },
  "device_health": {
    "battery_v": 3.7,
    "error_code": 0
  }
}
```

### Frontend

- The frontend is built with ReactJS.
- It connects to the backend via WebSockets to receive real-time SHM data updates.
- The dashboard visualizes structural health data using Chart.js, displaying vibration trends, environmental conditions, and device status.
- Users can log in to access the dashboard and monitor live structural readings from multiple sensor nodes.

**Key Features:**
- **Vibration Monitoring:** Real-time display of X, Y, Z-axis accelerations with 4-decimal precision
- **Environmental Tracking:** Temperature and humidity monitoring affecting structural materials  
- **Device Health:** Battery voltage and error code monitoring for each sensor node
- **Location-Based Filtering:** Filter data by sensor ID and structural location
- **Alert System:** Visual indicators for node health, temperature extremes, and battery status
- **Historical Analytics:** Statistical summaries (Min/Max/Avg) for trend analysis

## SHM Simulation Scenarios

The dashboard includes MQTT simulators to test different structural health scenarios:

### Scenario 1: Normal Operations
**Command:** `npm run simulate:normal`

Simulates a healthy structural monitoring node with:
- **Vibration Levels:** Low amplitude vibrations (±0.025g on X/Y axes, ~1g on Z-axis representing gravity)
- **Environmental:** Moderate temperature (26-30°C) and humidity (55-65%)
- **Device Health:** Healthy battery (3.65-3.75V) and no error codes
- **Use Case:** Baseline monitoring of stable infrastructure under normal loading conditions

### Scenario 2: Critical/Dangerous Conditions  
**Command:** `npm run simulate:danger`

Simulates a structural node under severe stress with:
- **High Vibrations:** Dangerous resonance levels (0-0.8g X-axis, 0-0.6g Y-axis, erratic Z-axis 0.4-1.6g)
- **Extreme Environment:** Either freezing conditions (-10 to -5°C) or overheating (55-65°C)
- **Humidity Extremes:** Very dry (5-15%) or oversaturated (90-100%) conditions
- **Device Failures:** Critical low battery (2.8-3.2V) and active error codes (1-4)
- **Use Case:** Testing dashboard response to potential structural failure, extreme weather, or sensor malfunctions

**Alert Conditions:**
- Vibration amplitudes > 0.3g indicate potential structural resonance or damage
- Temperature < 0°C or > 40°C suggests extreme environmental stress  
- Battery < 3.4V indicates imminent sensor failure
- Error codes > 0 suggest hardware malfunctions requiring maintenance

## Backend Details

- **Framework:** Node.js + Express.js (root folder)
- **Features:**
  - Connects to MongoDB for persistent sensor data storage
  - Subscribes to MQTT broker for incoming sensor data
  - Parses and saves sensor data to MongoDB
  - Broadcasts real-time updates to frontend clients via WebSockets
  - Provides REST API for historical data and authentication
  - Serves the React frontend build for public access
- **MQTT Topic:** Default is `iot` (configurable in `config.env`)

## SHM Data Schema

The MongoDB collection stores structural health readings with the following schema:

```javascript
{
  sensorId: String,           // e.g., "shm-node-alpha-01"
  location: String,           // e.g., "beam-section-4F"
  vibrationX: Number,         // X-axis acceleration (g)
  vibrationY: Number,         // Y-axis acceleration (g)  
  vibrationZ: Number,         // Z-axis acceleration (g)
  temperatureC: Number,       // Temperature in Celsius
  humidityPercent: Number,    // Relative humidity (%)
  batteryV: Number,           // Battery voltage (V)
  errorCode: Number,          // 0=OK, >0=fault codes
  timestamp: Date             // Reading timestamp
}
```

## Step-by-Step Setup Guide

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/SHM_Dashboard.git
   cd IoT_Dashboard
   ```
2. **Install backend dependencies:**
   ```bash
   npm install
   ```
3. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```
4. **Configure environment variables:**
   - Edit `config.env` with your MongoDB URI, MQTT broker URL, and SHM system settings.
   - Example:
     ```env
     MONGO_URI=mongodb://localhost:27017/iot_dashboard
     MQTT_URL=mqtt://localhost:1883
     MQTT_TOPIC=iot
     JWT_SECRET=your_jwt_secret_key
     JWT_EXPIRE=30d
     PORT=5000
     ```
5. **Build the frontend for production:**
   ```bash
   cd client
   npm run build
   cd ..
   ```
6. **Start the backend server (serves frontend build):**
   ```bash
   npm start
   ```
7. **Test with simulation scenarios:**
   ```bash
   # Terminal 1: Start normal SHM data simulation
   npm run simulate:normal
   
   # Terminal 2: Or test dangerous conditions
   npm run simulate:danger
   ```
8. **Open required ports in your firewall/cloud provider:**
   - Allow TCP traffic on port 5000 (or your configured PORT)
   - For MQTT, allow port 1883 if using remote devices
9. **Access the SHM dashboard:**
   - Open `http://<your-server-ip>:5000` in your browser
   - Login/register to access the structural health monitoring dashboard

## SHM Edge Node Firmware (maker.c++)

The `maker.c++` file contains the firmware code for SHM edge nodes (e.g., ESP32-based accelerometer sensors) that monitor structural vibrations and publish data to the MQTT broker.

### Hardware Requirements
- ESP32 or similar microcontroller
- 3-axis accelerometer/IMU (e.g., MPU6050, ADXL345)
- Optional: Temperature/humidity sensor (DHT22)
- Power supply with battery backup for continuous monitoring

### Configuration

1. **Open `maker.c++` in your Arduino IDE or PlatformIO.**
2. **Edit the following configuration to match your deployment:**
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";           // <-- WiFi network
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // <-- WiFi password  
   const char* MQTT_SERVER = "YOUR_SHM_SERVER_IP";     // <-- Dashboard server IP
   const char* SENSOR_ID = "shm-node-alpha-01";       // <-- Unique sensor identifier
   const char* LOCATION = "beam-section-4F";          // <-- Structural location
   ```
3. **Upload the code to your ESP32-based SHM node.**
4. **Mount the sensor node securely to the structural element being monitored.**

### Data Collection
The SHM node continuously:
- Reads 3-axis vibration data from accelerometer
- Monitors environmental temperature and humidity
- Checks battery voltage and system health
- Publishes JSON-formatted data every 2 seconds to the MQTT topic

**Deployment Notes:**
- Each node should have a unique `SENSOR_ID` and descriptive `LOCATION`
- Secure mounting is critical for accurate vibration measurements
- Consider weatherproofing for outdoor infrastructure deployments
- Battery backup ensures continuous monitoring during power outages

## Development Notes
- For local development, you can run the frontend and backend separately (`npm start` in both folders). The React dev server runs on port 3000 and the backend on port 5000.
- To access the React dev server externally, set `HOST=0.0.0.0` in the start script and open port 3000 in your firewall.
- For production/public access, always use the backend to serve the frontend build from a single port.
- Ensure MongoDB and MQTT broker (e.g., Mosquitto) are running and accessible.
- Use the simulation scripts to test dashboard functionality without physical sensors.

## Production Deployment with HTTPS and Domain

### Setting Up Domain and SSL Certificate

1. **Domain Setup:**
   - Purchase a domain name (e.g., `shm-monitor.com` from providers like Namecheap, GoDaddy)
   - Point the domain's A record to your server's public IP address
   - Wait for DNS propagation (can take up to 48 hours)

2. **Install Nginx (reverse proxy):**
   ```bash
   sudo apt update
   sudo apt install nginx
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

3. **Install Certbot for Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

4. **Configure Nginx for your domain:**
   ```bash
   sudo nano /etc/nginx/sites-available/shm-dashboard
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/shm-dashboard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

7. **Set up auto-renewal:**
   ```bash
   sudo crontab -e
   ```
   Add this line:
   ```
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

8. **Update firewall rules:**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

### Final Configuration

After setup, your SHM dashboard will be accessible at:
- `https://your-domain.com` (secure HTTPS)
- WebSocket connections will automatically upgrade to WSS (secure WebSocket)

**Security Notes:**
- Certbot automatically configures HTTPS redirect and strong SSL settings
- The Node.js app continues running on localhost:5000 (not publicly accessible)
- Only Nginx serves public traffic on ports 80/443
- SSL certificates auto-renew every 90 days

## Production Deployment
For production SHM systems:
- Use systemd services for automatic startup and monitoring
- Configure proper SSL/TLS certificates for secure dashboard access  
- Set up MongoDB with authentication and backup strategies
- Use secure MQTT with authentication for sensor node communications
- Implement log rotation and monitoring for system health
- Consider load balancing for high-availability deployments

