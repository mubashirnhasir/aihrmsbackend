const express = require("express");
const {
  createAnnouncement,
  getAllAnnouncements,
  getEmployeeAnnouncements,
  markAnnouncementAsRead,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Admin routes
router.post(
  "/",
  authMiddleware, // Re-added to ensure user is authenticated
  roleMiddleware("admin", "hr"), // Changed from ["admin", "hr"]
  createAnnouncement
);
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "hr"), // Changed from ["admin", "hr"]
  getAllAnnouncements
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "hr"), // Changed from ["admin", "hr"]
  updateAnnouncement
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "hr"), // Changed from ["admin", "hr"]
  deleteAnnouncement
);

// Employee routes
router.get("/employee", authMiddleware, getEmployeeAnnouncements);
router.post("/:id/read", authMiddleware, markAnnouncementAsRead);

module.exports = router;
