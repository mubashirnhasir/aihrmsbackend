// Simple test to check database connection and employee data
const mongoose = require("mongoose");
require("dotenv").config();

async function testEmployeeData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    // Find the Employee model
    const Employee = require("./models/employeeSchema");

    // Get all employees and their leave requests
    const employees = await Employee.find(
      {},
      "name employeeId leaveRequests"
    ).limit(5);

    console.log("\n📋 Employee Leave Data:");
    employees.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.name} (${emp.employeeId})`);
      console.log(`   Leave Requests: ${emp.leaveRequests?.length || 0}`);

      if (emp.leaveRequests?.length > 0) {
        emp.leaveRequests.forEach((req, reqIndex) => {
          console.log(
            `   ${reqIndex + 1}. ${req.type} - ${
              req.status
            } (${req.appliedOn?.toDateString()})`
          );
        });
      }
    });

    console.log("\n✅ Test completed");
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testEmployeeData();
