const mongoose = require("mongoose");
require("dotenv").config();

const Employee = require("../models/employeeSchema");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database Connected Successfully");
  } catch (error) {
    console.error("❌ Error connecting to database:", error);
    process.exit(1);
  }
};

const verifyEmployees = async () => {
  try {
    const employees = await Employee.find({
      employeeId: { $in: ["EMP002", "EMP003"] },
    }).select("name email employeeId department designation isFirstLogin");

    console.log("\n📋 Verified Employee Data:");
    console.log("==========================");

    employees.forEach((emp) => {
      console.log(`\n👤 ${emp.name}`);
      console.log(`   ID: ${emp.employeeId}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Department: ${emp.department}`);
      console.log(`   Designation: ${emp.designation}`);
      console.log(
        `   First Login: ${
          emp.isFirstLogin ? "Yes (Ready for onboarding)" : "No"
        }`
      );
    });
  } catch (error) {
    console.error("❌ Error verifying employees:", error);
  }
};

const runVerification = async () => {
  await connectDb();
  await verifyEmployees();
  process.exit(0);
};

runVerification();
