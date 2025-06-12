const express = require("express"); // ✅
const employeeRouter = express.Router(); // ✅
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
  downloadDocument,
  createEmployeeOnboarding,
  getEmployeeOnboardingStatus,
} = require("../controllers/employeeController");
const currentUserToken = require("../middlewares/currentUserMiddleware");
const verifyToken = require("../middlewares/authMiddleware");

// Dashboard route
employeeRouter.get("/dashboard", verifyToken, getEmployeeDashboard);

// Profile routes
employeeRouter.get("/profile", verifyToken, getEmployeeProfile);
employeeRouter.put("/profile", verifyToken, updateEmployeeProfile);

// Attendance routes
employeeRouter.get("/attendance", verifyToken, getEmployeeAttendance);
employeeRouter.post("/attendance/clock-in", verifyToken, clockIn);
employeeRouter.post("/attendance/clock-out", verifyToken, clockOut);

// Leave routes
employeeRouter.get("/leaves", verifyToken, getEmployeeLeaves);
employeeRouter.post("/leaves/request", verifyToken, requestLeave);

// Document routes
employeeRouter.get("/documents", verifyToken, getEmployeeDocuments);
employeeRouter.post("/documents/upload", verifyToken, uploadDocument);
employeeRouter.get(
  "/documents/:documentId/download",
  verifyToken,
  downloadDocument
);

// Career development routes
employeeRouter.post("/updateRecommended", updateRecommendedSkills);
employeeRouter.post("/study-plan/complete-module", markModuleComplete);
employeeRouter.post("/study-plan/save", saveStudyPlan);
employeeRouter.post("/career-path", generateCareerPath);
employeeRouter.post("/roadmap", generateRoadmap);

// Onboarding routes
employeeRouter.post("/onboarding", verifyToken, createEmployeeOnboarding);
employeeRouter.get(
  "/onboarding-status",
  verifyToken,
  getEmployeeOnboardingStatus
);

module.exports = employeeRouter;
