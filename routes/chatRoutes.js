const express = require("express");
const { handleChat, getHRFAQ } = require("../controllers/chatController");

const router = express.Router();

// POST /api/chat - Handle chat messages
router.post("/", handleChat);

// GET /api/chat/faq - Get HR FAQ
router.get("/faq", getHRFAQ);

module.exports = router;
