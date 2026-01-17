const mongoose = require("mongoose");

const SensorReadingSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  vibrationX: {
    type: Number,
    required: true,
  },
  vibrationY: {
    type: Number,
    required: true,
  },
  vibrationZ: {
    type: Number,
    required: true,
  },
  temperatureC: {
    type: Number,
    required: true,
  },
  humidityPercent: {
    type: Number,
    required: true,
  },
  batteryV: {
    type: Number,
    required: true,
  },
  errorCode: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SensorReading", SensorReadingSchema);
