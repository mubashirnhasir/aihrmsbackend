const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["manager", "admin", "user"],
    },
    
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false }

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
