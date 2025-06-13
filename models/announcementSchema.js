const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed from true to false
    },
    authorName: {
      type: String,
      required: true,
    },
    authorDesignation: {
      type: String,
      default: "Admin",
    },
    image: {
      type: String, // URL or path to image
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    targetAudience: {
      type: String,
      enum: ["all", "specific"],
      default: "all",
    },
    departments: [
      {
        type: String,
      },
    ],
    readBy: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ priority: 1 });

module.exports = mongoose.model("Announcement", announcementSchema);
