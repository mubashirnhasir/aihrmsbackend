const Announcement = require("../models/announcementSchema");
const User = require("../models/userSchema");
const Employee = require("../models/employeeSchema");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

// @desc Create a new announcement
// @route POST /api/announcements
// @access Private (Admin only)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, targetAudience, departments, image } =
      req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userName = req.user?.name; // Get name from req.user for placeholder admin

    if (!title || !content) {
      return res
        .status(400)
        .json(new ApiError(400, "Title and content are required"));
    }

    let authorNameFromDb = userName; // Default to req.user.name
    let authorDesignationFromDb = userRole; // Default to req.user.role
    let authorObjectId = null; // Initialize authorObjectId to null

    // If the user is not the placeholder admin, fetch from DB and get their ObjectId
    if (userId !== "admin") {
      const userFromDb = await User.findById(userId).select("name role _id"); // Select _id as well
      if (!userFromDb) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }
      authorNameFromDb = userFromDb.name;
      authorDesignationFromDb = userFromDb.role;
      authorObjectId = userFromDb._id; // Assign the actual ObjectId
    } else {
      // For placeholder admin, name and role are from req.user, authorObjectId remains null
      // (or you could assign a specific known ObjectId for a generic system admin user if one exists)
      authorNameFromDb = userName || "Admin User"; // Fallback if somehow name isn't on req.user
      authorDesignationFromDb = userRole || "Admin"; // Fallback for designation
    }

    const announcementDetails = {
      title,
      content,
      priority: priority || "medium",
      authorName: authorNameFromDb,
      authorDesignation: authorDesignationFromDb,
      targetAudience: targetAudience || "all",
      departments: departments || [],
      image: image || null,
    };

    // Only add author field if authorObjectId is not null
    // This assumes your schema allows author to be optional or null.
    // If author is strictly required, this will cause a validation error if authorObjectId is null.
    if (authorObjectId) {
      announcementDetails.author = authorObjectId;
    }

    const announcement = new Announcement(announcementDetails);

    const savedAnnouncement = await announcement.save();

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          savedAnnouncement,
          "Announcement created successfully"
        )
      );
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json(new ApiError(500, "Failed to create announcement"));
  }
};

// @desc Get all announcements for admin
// @route GET /api/announcements
// @access Private (Admin only)
const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10, priority, isActive } = req.query;

    // Build query
    let query = {};
    if (priority && priority !== "all") {
      query.priority = priority;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const announcements = await Announcement.find(query)
      .populate("author", "name email role")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnnouncements = await Announcement.countDocuments(query);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          announcements,
          totalPages: Math.ceil(totalAnnouncements / limit),
          currentPage: page,
          totalAnnouncements,
        },
        "Announcements retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json(new ApiError(500, "Failed to fetch announcements"));
  }
};

// @desc Get announcements for employees
// @route GET /api/announcements/employee
// @access Private (Employee)
const getEmployeeAnnouncements = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const employeeId = req.user?.id;

    // Get employee details to check department
    const employee = await Employee.findById(employeeId).select("department");
    if (!employee) {
      return res.status(404).json(new ApiError(404, "Employee not found"));
    }

    // Build query for announcements
    // Show announcements that are:
    // 1. Active
    // 2. Target audience is 'all' OR target specific departments that include this employee's department
    const query = {
      isActive: true,
      $or: [
        { targetAudience: "all" },
        {
          targetAudience: "specific",
          departments: { $in: [employee.department] },
        },
      ],
    };

    const announcements = await Announcement.find(query)
      .select(
        "title content priority authorName authorDesignation image createdAt readBy"
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1);

    // Mark which announcements have been read by this employee
    const announcementsWithReadStatus = announcements.map((announcement) => {
      const hasRead = announcement.readBy.some(
        (read) => read.employeeId.toString() === employeeId
      );

      return {
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        authorName: announcement.authorName,
        authorDesignation: announcement.authorDesignation,
        image: announcement.image,
        createdAt: announcement.createdAt,
        isNew: !hasRead,
        date: formatRelativeDate(announcement.createdAt),
      };
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          announcementsWithReadStatus,
          "Employee announcements retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching employee announcements:", error);
    res.status(500).json(new ApiError(500, "Failed to fetch announcements"));
  }
};

// @desc Mark announcement as read by employee
// @route POST /api/announcements/:id/read
// @access Private (Employee)
const markAnnouncementAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user?.id;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json(new ApiError(404, "Announcement not found"));
    }

    // Check if already read
    const alreadyRead = announcement.readBy.some(
      (read) => read.employeeId.toString() === employeeId
    );

    if (!alreadyRead) {
      announcement.readBy.push({
        employeeId: employeeId,
        readAt: new Date(),
      });
      await announcement.save();
    }

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Announcement marked as read"));
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    res
      .status(500)
      .json(new ApiError(500, "Failed to mark announcement as read"));
  }
};

// @desc Update announcement
// @route PUT /api/announcements/:id
// @access Private (Admin only)
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const announcement = await Announcement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!announcement) {
      return res.status(404).json(new ApiError(404, "Announcement not found"));
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, announcement, "Announcement updated successfully")
      );
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json(new ApiError(500, "Failed to update announcement"));
  }
};

// @desc Delete announcement
// @route DELETE /api/announcements/:id
// @access Private (Admin only)
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json(new ApiError(404, "Announcement not found"));
    }

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Announcement deleted successfully"));
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json(new ApiError(500, "Failed to delete announcement"));
  }
};

// Helper function to format relative dates
const formatRelativeDate = (date) => {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "Today";
  } else if (diffDays === 2) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getEmployeeAnnouncements,
  markAnnouncementAsRead,
  updateAnnouncement,
  deleteAnnouncement,
};
