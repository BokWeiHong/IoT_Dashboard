const express = require("express");
const router = express.Router();
const SensorReading = require("../models/SensorReading");

// GET /api/sensor-history?limit=100
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const readings = await SensorReading.find({})
      .sort({ timestamp: 1 })
      .limit(limit);
    res.json({ success: true, data: readings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
