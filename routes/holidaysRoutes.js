const express = require("express");
const { getHolidays } = require("../controllers/holidaysController");

const router = express.Router();

// GET /api/holidays - Get holidays for a country and year
router.get("/", getHolidays);

module.exports = router;
