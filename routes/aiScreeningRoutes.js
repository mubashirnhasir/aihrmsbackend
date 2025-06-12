const express = require("express");
const { generateQuestions, evaluateVideoInterview } = require("../controllers/aiScreeningController");

const router = express.Router();

// POST /api/ai-screening/generate-questions - Generate screening questions
router.post("/generate-questions", generateQuestions);

// POST /api/ai-screening/evaluate-video-interview - Evaluate video interview
router.post("/evaluate-video-interview", evaluateVideoInterview);

module.exports = router;
