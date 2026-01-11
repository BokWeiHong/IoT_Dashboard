# IoT Dashboard

data to all the connected React clients and the sensor data gets displayed on the dashboard in real-time. The app consists

## Overview

IoT Dashboard is a real-time web application made using ReactJS, NodeJS, ExpressJS, MQTT, and MongoDB.

## Architecture

### Backend

- The backend is built with Node.js and Express.js.
- It connects to a MongoDB database to store sensor readings.
- It uses the MQTT protocol to receive sensor data from external devices (e.g., Raspberry Pi, Cytron Maker, etc.).
- When a device publishes sensor data to the MQTT broker (default: `mqtt://localhost:1883`), the backend subscribes to the relevant topic (default: `sensors/ldr`).
- Upon receiving a message, the backend parses the data and saves it into MongoDB using the `SensorReading` model.
- The backend also provides a WebSocket server to broadcast real-time sensor data to connected frontend clients.

### Frontend

- The frontend is built with ReactJS.
- It connects to the backend via WebSockets to receive real-time sensor data updates.
- The dashboard visualizes sensor data using Chart.js, displaying both graphs and text-based components.
- Users can log in to access the dashboard and view live sensor readings.

## Frontend Details

- **Framework:** ReactJS (located in the `client` folder)
- **Features:**
  - Real-time sensor data updates via WebSockets
  - Historical data fetch via REST API
  - Data visualization with Chart.js (graphs, tables, summary cards)
  - Device ID filtering, data table, and summary statistics
  - User authentication (login/register)
- **Build/Deploy:**
  - For production, run `npm run build` in the `client` folder. The build output is served by the backend.

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

## Step-by-Step Guide (GitHub Deployment)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/IoT_Dashboard.git
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
   - Edit `config.env` with your MongoDB URI, MQTT broker URL, and any other required settings.
   - Example:
     ```env
     MONGO_URI=mongodb://localhost:27017/iot_dashboard
     MQTT_URL=mqtt://localhost:1883
     MQTT_TOPIC=iot
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
7. **Open required ports in your firewall/cloud provider:**
   - Allow TCP traffic on port 5000 (or your configured PORT)
   - For MQTT, allow port 1883 if using remote devices
8. **Access the dashboard:**
   - Open `http://<your-server-ip>:5000` in your browser
   - Login/register to access the dashboard

## Development Notes
- For local development, you can run the frontend and backend separately (`npm start` in both folders). The React dev server runs on port 3000 and the backend on port 5000.
- To access the React dev server externally, set `HOST=0.0.0.0` in the start script and open port 3000 in your firewall.
- For production/public access, always use the backend to serve the frontend build.
- Ensure MongoDB and MQTT broker are running and accessible.

