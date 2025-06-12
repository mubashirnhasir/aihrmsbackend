const express = require("express");
const { predictRetention, getAnalytics } = require("../controllers/employeeRetentionController");

const router = express.Router();

// POST /api/employee-retention/predict - Predict employee retention risk
router.post("/predict", predictRetention);

// GET /api/employee-retention/analytics - Get retention analytics
router.get("/analytics", getAnalytics);

module.exports = router;
