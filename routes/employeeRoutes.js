const express = require("express");
const router = express.Router();
const {
  getEmployeeProfile,
  updateRecommendedSkills,
  markModuleComplete,
  saveStudyPlan,
  generateCareerPath,
  generateRoadmap,
} = require("../controllers/employeeController");

router.get("/profile", getEmployeeProfile);
router.post("/updateRecommended", updateRecommendedSkills);
router.post("/study-plan/complete-module", markModuleComplete);
router.post("/study-plan/save", saveStudyPlan);

router.post("/career-path", generateCareerPath);
router.post("/roadmap", generateRoadmap);

module.exports = router;
