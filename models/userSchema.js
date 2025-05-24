const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: "", 
    },
    role: {
      type: String,
      required: true,
      enum: ["manager", "admin", "user"],
    },

    experience: {
      type: Number,
      default: 0,
    },
    department: {
      type: String,
      default: "Not Assigned",
    },
    roleTitle: {
      type: String,
      default: "Employee",
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
