const mongoose = require("mongoose")

const employeeSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    phone: {
        type: String,
    },
    department: {
        type: String,
    },
    designation: {
        type: String,

    },
    joiningDate: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        default: "employee"
    },
    status: {
        type: String,
        enum: ["active", "inactive"], default: "active"
    },
    profilePicture: {
        type: String, default: "uploads/profile.png"
    },
    casualLeaves: { type: Number, default: 2 },
    sickLeaves: { type: Number, default: 2 },
    earnedLeaves: { type: Number, default: 2 },
    unpaidLeaves: { type: Number, default: 0 },
    assets: { type: Array, default: [] },
    attendance: { type: Array, default: [] },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false }






}, {
    timestamps: true
})


module.exports = mongoose.model("Employee", employeeSchema)