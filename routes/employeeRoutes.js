const express = require("express"); // ✅
const employeeRouter = express.Router(); // ✅
const { getEmployeeProfile, updateRecommendedSkills, markModuleComplete, saveStudyPlan, generateCareerPath, generateRoadmap, getEmployeeDashboard,
  updateEmployeeProfile,
  getEmployeeAttendance,
  clockIn,
  clockOut,
  getEmployeeLeaves,
  requestLeave,
  getEmployeeDocuments,
  uploadDocument,
} = require("../controllers/employeeController");
const currentUserToken = require("../middlewares/currentUserMiddleware");

employeeRouter.get("/profile", getEmployeeProfile);
employeeRouter.post("/updateRecommended", updateRecommendedSkills);
employeeRouter.post("/study-plan/complete-module", markModuleComplete);
employeeRouter.post("/study-plan/save", saveStudyPlan);
employeeRouter.post("/career-path", generateCareerPath);
employeeRouter.post("/roadmap", generateRoadmap);

module.exports = employeeRouter;
