const mongoose = require("mongoose");

const SensorReadingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  temp: {
    type: Number,
    required: true,
  },
  humid: {
    type: Number,
    required: true,
  },
  soil: {
    type: Number,
    required: true,
  },
  rain: {
    type: Number,
    required: true,
  },
  pump: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SensorReading", SensorReadingSchema);
