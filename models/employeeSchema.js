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
    email: String,
    phone: String,
    department: String,
    designation: String,
    joiningDate: Date,
    role: String,
    status: String,
    profilePicture: String,
    casualLeaves: Number,
    sickLeaves: Number,
    earnedLeaves: Number,
    unpaidLeaves: Number,
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
