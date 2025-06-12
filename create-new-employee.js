const mongoose = require("mongoose");
const Employee = require("./models/employeeSchema");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const createNewEmployee = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    // Create new employee
    const hashedPassword = await bcrypt.hash("password123", 10);

    const newEmployee = new Employee({
      name: "John Smith",
      email: "john.smith@company.com",
      employeeId: "EMP002",
      password: hashedPassword,
      designation: "Software Engineer",
      department: "Engineering",
      joiningDate: new Date(),
      status: "active",
      isFirstLogin: true, // This will redirect to onboarding
    });

    await newEmployee.save();

    console.log("✅ New employee created successfully!");
    console.log("📋 Login Credentials:");
    console.log("Employee ID: EMP002");
    console.log("Password: password123");
    console.log("Email: john.smith@company.com");
    console.log(
      "\n🔗 Use these credentials at: http://localhost:3001/employee/auth/signin"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating employee:", error);
    process.exit(1);
  }
};

createNewEmployee();
