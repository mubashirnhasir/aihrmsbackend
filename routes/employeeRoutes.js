const express = require("express"); // ✅
const employeeRouter = express.Router(); // ✅
const { getEmployeeProfile, updateRecommendedSkills, markModuleComplete, saveStudyPlan, generateCareerPath, generateRoadmap } = require("../controllers/employeeController");

employeeRouter.get("/profile", getEmployeeProfile);
employeeRouter.post("/updateRecommended", updateRecommendedSkills);
employeeRouter.post("/study-plan/complete-module", markModuleComplete);
employeeRouter.post("/study-plan/save", saveStudyPlan);
employeeRouter.post("/career-path", generateCareerPath);
employeeRouter.post("/roadmap", generateRoadmap);

module.exports = employeeRouter;
