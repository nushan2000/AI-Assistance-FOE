const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const { getMonthlyUsage } = require("../controllers/analyticsController");

// GET /analytics/usage?year=YYYY&month=MM
router.get("/usage", authenticateToken, getMonthlyUsage);

module.exports = router;
