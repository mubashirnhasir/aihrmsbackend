// Script to populate career development data for users
const mongoose = require("mongoose");
require("dotenv").config();

const Employee = require("../models/employeeSchema");

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const careerData = {
  skills: [
    { name: "JavaScript", level: "Advanced", category: "Programming" },
    { name: "React", level: "Advanced", category: "Frontend" },
    { name: "Node.js", level: "Intermediate", category: "Backend" },
    { name: "MongoDB", level: "Intermediate", category: "Database" },
    { name: "Python", level: "Beginner", category: "Programming" },
    { name: "Machine Learning", level: "Beginner", category: "AI/ML" },
  ],
  recommendedSkills: [
    { name: "TypeScript" },
    { name: "Docker" },
    { name: "Kubernetes" },
    { name: "AWS" },
    { name: "GraphQL" },
  ],
  studyPlans: [
    {
      skillName: "TypeScript",
      modules: [
        {
          title: "TypeScript Basics",
          resources: [
            {
              label: "TypeScript Handbook",
              url: "https://www.typescriptlang.org/docs/",
            },
            {
              label: "TypeScript Tutorial",
              url: "https://www.w3schools.com/typescript/",
            },
          ],
          completed: false,
        },
        {
          title: "Advanced TypeScript",
          resources: [
            {
              label: "Advanced Types",
              url: "https://www.typescriptlang.org/docs/handbook/2/types-from-types.html",
            },
          ],
          completed: false,
        },
      ],
    },
    {
      skillName: "Docker",
      modules: [
        {
          title: "Docker Fundamentals",
          resources: [
            { label: "Docker Documentation", url: "https://docs.docker.com/" },
            { label: "Docker Tutorial", url: "https://docker-curriculum.com/" },
          ],
          completed: false,
        },
      ],
    },
  ],
  careerPaths: [
    {
      skillsSignature: "js-react-node",
      options: [
        "Senior Full Stack Developer",
        "Tech Lead",
        "Frontend Architect",
      ],
      updatedAt: new Date(),
    },
  ],
};

async function populateCareerData() {
  try {
    console.log("🔍 Checking for John Doe user...");

    let johnDoe = await Employee.findOne({ name: "John Doe" });

    if (!johnDoe) {
      console.log("❌ John Doe not found. Creating John Doe user...");
      johnDoe = await Employee.create({
        name: "John Doe",
        email: "john.doe@company.com",
        phone: "+1234567890",
        department: "Engineering",
        designation: "Senior Developer",
        joiningDate: new Date("2022-01-15"),
        role: "Developer",
        employeeId: "EMP001",
        password: "password123", // In real app, this should be hashed
        profilePicture: "uploads/profile.png",
        ...careerData,
      });
      console.log("✅ John Doe created with career data");
    } else {
      console.log("✅ John Doe found. Updating career data...");
      johnDoe.skills = careerData.skills;
      johnDoe.recommendedSkills = careerData.recommendedSkills;
      johnDoe.studyPlans = careerData.studyPlans;
      johnDoe.careerPaths = careerData.careerPaths;
      await johnDoe.save();
      console.log("✅ John Doe career data updated");
    }

    // Now update other users if they don't have career data
    console.log("🔍 Checking other users...");
    const otherEmployees = await Employee.find({
      name: { $ne: "John Doe" },
      $or: [{ skills: { $exists: false } }, { skills: { $size: 0 } }],
    });

    console.log(`📊 Found ${otherEmployees.length} users without career data`);

    for (const employee of otherEmployees) {
      console.log(`📝 Updating career data for ${employee.name}...`);

      // Customize skills based on department
      let customizedSkills = [...careerData.skills];
      if (employee.department === "Marketing") {
        customizedSkills = [
          {
            name: "Digital Marketing",
            level: "Advanced",
            category: "Marketing",
          },
          { name: "SEO", level: "Intermediate", category: "Marketing" },
          { name: "Content Writing", level: "Advanced", category: "Content" },
          { name: "Analytics", level: "Intermediate", category: "Analytics" },
        ];
      } else if (employee.department === "HR") {
        customizedSkills = [
          { name: "Recruitment", level: "Advanced", category: "HR" },
          { name: "Employee Relations", level: "Advanced", category: "HR" },
          {
            name: "Performance Management",
            level: "Intermediate",
            category: "HR",
          },
          { name: "HR Analytics", level: "Beginner", category: "Analytics" },
        ];
      } else if (employee.department === "Finance") {
        customizedSkills = [
          {
            name: "Financial Analysis",
            level: "Advanced",
            category: "Finance",
          },
          { name: "Excel", level: "Advanced", category: "Tools" },
          {
            name: "Financial Modeling",
            level: "Intermediate",
            category: "Finance",
          },
          { name: "Accounting", level: "Advanced", category: "Finance" },
        ];
      }

      employee.skills = customizedSkills;
      employee.recommendedSkills = careerData.recommendedSkills;
      employee.studyPlans = careerData.studyPlans;
      employee.careerPaths = careerData.careerPaths;

      await employee.save();
      console.log(`✅ Updated ${employee.name}`);
    }

    console.log("🎉 Career data population completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error populating career data:", error);
    process.exit(1);
  }
}

populateCareerData();
