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
    leaveRequests: [
      {
        type: { type: String, enum: ["casual", "sick", "earned", "unpaid"] },
        startDate: Date,
        endDate: Date,
        reason: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        appliedOn: { type: Date, default: Date.now },
        approvedBy: String,
        comments: String,
      },
    ],

    // Attendance fields
    attendance: [
      {
        date: { type: Date, required: true },
        clockIn: Date,
        clockOut: Date,
        totalHours: Number,
        status: {
          type: String,
          enum: ["present", "absent", "late", "half-day"],
          default: "present",
        },
        location: String,
      },
    ],

    // Document Management
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadedOn: { type: Date, default: Date.now },
        category: {
          type: String,
          enum: ["personal", "professional", "compliance"],
        },
      },
    ],

    // Personal Information (extended)
    firstName: String,
    lastName: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    nationality: String,
    dateOfBirth: Date,

    // Address Information
    address: {
      presentAddress: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      postalCode: String,
    },

    // Previous Employment History
    previousEmployment: [
      {
        companyName: String,
        designation: String,
        fromDate: Date,
        toDate: Date,
        companyAddress: String,
      },
    ],

    // Family Details
    familyDetails: [
      {
        name: String,
        relationship: String,
        gender: String,
        bloodGroup: String,
        nationality: String,
        isMinor: { type: Boolean, default: false },
      },
    ],

    // Employment Details
    manager: String,
    team: String,
    workLocation: String,
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "intern"],
    },
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
    roadmaps: [RoadmapSchema], // Profile sections for frontend compatibility
    bankDetails: {
      bankName: String,
      accountNumber: String,
      bankAccountNumber: String,
      confirmBankAccountNumber: String,
      routingNumber: String,
      accountType: String,
      accountHolderName: String,
      nameAsPerBankAccount: String,
      swiftCode: String,
      iban: String,
      bankCode: String,
      ifscCode: String,
      panNumber: String,
      aadharNumber: String,
      pfNumber: String,
      esiNumber: String,
      country: { type: String, default: "India" },
    }, // Onboarding fields
    onboardingCompleted: { type: Boolean, default: false },
    onboardingCompletedDate: Date,
    documentAttachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    preferences: {
      language: { type: String, default: "en" },
      timezone: String,
      theme: { type: String, default: "light" },
      dateFormat: { type: String, default: "MM/dd/yyyy" },
      timeFormat: { type: String, default: "12h" },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        leaveRequests: { type: Boolean, default: true },
        attendance: { type: Boolean, default: true },
        payroll: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema, "employees");
