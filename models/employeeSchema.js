const mongoose = require("mongoose");
const CareerPathOption = new mongoose.Schema({
  skillsSignature: String,
  options: [String],
  updatedAt: { type: Date, default: Date.now },
  skillsHash: String,
});
const RoadmapTierSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bullets: [{ type: String }],
});

const RoadmapSchema = new mongoose.Schema({
  role: { type: String, required: true }, // e.g. “Data Engineer”
  tiers: [RoadmapTierSchema], // always 4 tiers
  createdAt: { type: Date, default: Date.now },
});
const employeeSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    phone: String,
    department: String,
    designation: String,
    joiningDate: Date,
    role: String,
    status: { type: String, default: "active" },
    profilePicture: String,
    
    // Authentication fields
    password: String,
    employeeId: { type: String, unique: true },
    isFirstLogin: { type: Boolean, default: true },
    lastLogin: Date,
      // Leave Management
    casualLeaves: { type: Number, default: 1 },
    sickLeaves: { type: Number, default: 2 },
    earnedLeaves: { type: Number, default: 1 },
    unpaidLeaves: { type: Number, default: 0 },
    leaveRequests: [{
      type: { type: String, enum: ['casual', 'sick', 'earned', 'unpaid'] },
      startDate: Date,
      endDate: Date,
      reason: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      appliedOn: { type: Date, default: Date.now },
      approvedBy: String,
      comments: String
    }],
    
    // Attendance fields
    attendance: [{
      date: { type: Date, required: true },
      clockIn: Date,
      clockOut: Date,
      totalHours: Number,
      status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'present' },
      location: String
    }],
    
    // Document Management
    documents: [{
      name: String,
      type: String,
      url: String,
      uploadedOn: { type: Date, default: Date.now },
      category: { type: String, enum: ['personal', 'professional', 'compliance'] }
    }],
    
    // Personal Information (extended)
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    },
    
    // Employment Details
    manager: String,
    team: String,
    workLocation: String,
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern'] },
    salary: Number,
    
    assets: Array,
    careerPaths: [CareerPathOption],
    studyPlans: {
      type: [
        {
          skillName: { type: String, required: true },
          modules: [
            {
              title: { type: String },
              resources: [
                {
                  label: String,
                  url: String,
                },
              ],
              completed: { type: Boolean, default: false },
            },
          ],
        },
      ],
      default: [],
    },
    skills: {
      type: [
        {
          name: { type: String, required: true },
          level: { type: String, default: "Beginner" },
          category: { type: String },
        },
      ],
      default: [],
    },
    recommendedSkills: {
      type: [{ name: String }],
      default: [],
    },
    roadmaps: [RoadmapSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema, "employees");
