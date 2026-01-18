const express = require("express");
const router = express.Router();
const SensorReading = require("../models/SensorReading");

// GET /api/sensor-history?limit=100
router.get("/", async (req, res) => {
  try {
    // Ensure limit is a safe integer and within reasonable bounds
    let limit = parseInt(req.query.limit, 10) || 100;
    if (isNaN(limit) || limit <= 0) limit = 100;
    limit = Math.min(limit, 1000); // cap at 1000 to avoid heavy queries
    const readings = await SensorReading.find({})
      .sort({ timestamp: 1 })
      .limit(limit);
    res.json({ success: true, data: readings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
