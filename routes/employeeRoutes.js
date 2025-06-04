const express = require("express");
const router = express.Router();
const {
  getEmployeeProfile,
  updateRecommendedSkills,
  markModuleComplete,
  saveStudyPlan,
  generateCareerPath,
  generateRoadmap,
  getEmployeeDashboard,
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

// Existing routes
router.get("/profile", getEmployeeProfile);
router.post("/updateRecommended", updateRecommendedSkills);
router.post("/study-plan/complete-module", markModuleComplete);
router.post("/study-plan/save", saveStudyPlan);
router.post("/career-path", generateCareerPath);
router.post("/roadmap", generateRoadmap);

// New employee portal routes
router.get("/dashboard", currentUserToken, getEmployeeDashboard);
router.put("/profile", currentUserToken, updateEmployeeProfile);

// Attendance routes
router.get("/attendance", currentUserToken, getEmployeeAttendance);
router.post("/attendance/clock-in", currentUserToken, clockIn);
router.post("/attendance/clock-out", currentUserToken, clockOut);

// Leave routes
router.get("/leaves", currentUserToken, getEmployeeLeaves);
router.post("/leaves/request", currentUserToken, requestLeave);

// Document routes
router.get("/documents", currentUserToken, getEmployeeDocuments);
router.post("/documents/upload", currentUserToken, uploadDocument);

module.exports = router;
