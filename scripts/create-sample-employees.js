const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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

const createSampleEmployees = async () => {
  try {
    // Hash password for all employees
    const hashedPassword = await bcrypt.hash("password123", 10);

    const sampleEmployees = [
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@synapt.com",
        phone: "+1-555-0102",
        department: "Marketing",
        designation: "Marketing Specialist",
        joiningDate: new Date("2024-03-15"),
        role: "employee",
        status: "active",
        employeeId: "EMP002",
        password: hashedPassword,
        isFirstLogin: true,

        // Leave balances
        casualLeaves: 12,
        sickLeaves: 8,
        earnedLeaves: 15,
        unpaidLeaves: 0,

        // Personal Information
        dateOfBirth: new Date("1992-08-22"),
        address: {
          street: "456 Oak Avenue",
          city: "San Francisco",
          state: "California",
          country: "USA",
          zipCode: "94102",
        },
        emergencyContact: {
          name: "Michael Johnson",
          relationship: "Spouse",
          phone: "+1-555-0103",
          email: "michael.johnson@email.com",
        },

        // Employment Details
        manager: "Jennifer Smith",
        team: "Digital Marketing",
        workLocation: "San Francisco Office",
        employmentType: "full-time",
        salary: 65000,

        // Skills
        skills: [
          {
            name: "Digital Marketing",
            level: "Intermediate",
            category: "Marketing",
          },
          { name: "Content Creation", level: "Advanced", category: "Creative" },
          { name: "Analytics", level: "Beginner", category: "Data" },
        ],

        // Bank Details
        bankDetails: {
          bankName: "Chase Bank",
          accountNumber: "****6789",
          routingNumber: "021000021",
          accountType: "Checking",
          accountHolderName: "Sarah Johnson",
        },

        // Preferences
        preferences: {
          language: "en",
          timezone: "America/Los_Angeles",
          theme: "light",
          dateFormat: "MM/dd/yyyy",
          timeFormat: "12h",
          notifications: {
            email: true,
            sms: false,
            push: true,
            leaveRequests: true,
            attendance: true,
            payroll: true,
            announcements: true,
          },
        },
      },
      {
        name: "David Chen",
        email: "david.chen@synapt.com",
        phone: "+1-555-0104",
        department: "Engineering",
        designation: "Frontend Developer",
        joiningDate: new Date("2024-02-01"),
        role: "employee",
        status: "active",
        employeeId: "EMP003",
        password: hashedPassword,
        isFirstLogin: true,

        // Leave balances
        casualLeaves: 10,
        sickLeaves: 12,
        earnedLeaves: 18,
        unpaidLeaves: 0,

        // Personal Information
        dateOfBirth: new Date("1990-11-15"),
        address: {
          street: "789 Pine Street",
          city: "Seattle",
          state: "Washington",
          country: "USA",
          zipCode: "98101",
        },
        emergencyContact: {
          name: "Lisa Chen",
          relationship: "Sister",
          phone: "+1-555-0105",
          email: "lisa.chen@email.com",
        },

        // Employment Details
        manager: "Alex Rodriguez",
        team: "Frontend Development",
        workLocation: "Seattle Office",
        employmentType: "full-time",
        salary: 85000,

        // Skills
        skills: [
          { name: "React", level: "Advanced", category: "Frontend" },
          { name: "JavaScript", level: "Advanced", category: "Programming" },
          {
            name: "TypeScript",
            level: "Intermediate",
            category: "Programming",
          },
          { name: "CSS", level: "Advanced", category: "Frontend" },
        ],

        // Bank Details
        bankDetails: {
          bankName: "Bank of America",
          accountNumber: "****5432",
          routingNumber: "026009593",
          accountType: "Checking",
          accountHolderName: "David Chen",
        },

        // Preferences
        preferences: {
          language: "en",
          timezone: "America/Los_Angeles",
          theme: "dark",
          dateFormat: "dd/MM/yyyy",
          timeFormat: "24h",
          notifications: {
            email: true,
            sms: true,
            push: true,
            leaveRequests: true,
            attendance: true,
            payroll: true,
            announcements: false,
          },
        },
      },
    ];

    // Check if employees already exist
    for (const employeeData of sampleEmployees) {
      const existingEmployee = await Employee.findOne({
        $or: [
          { email: employeeData.email },
          { employeeId: employeeData.employeeId },
        ],
      });

      if (existingEmployee) {
        console.log(
          `⚠️  Employee with email ${employeeData.email} or ID ${employeeData.employeeId} already exists. Skipping...`
        );
        continue;
      }

      const employee = new Employee(employeeData);
      await employee.save();
      console.log(
        `✅ Created employee: ${employeeData.name} (${employeeData.employeeId})`
      );
    }

    console.log("\n🎉 Sample employees created successfully!");
    console.log("\n📋 Employee Login Credentials:");
    console.log("================================");
    console.log("Employee ID: EMP002");
    console.log("Email: sarah.johnson@synapt.com");
    console.log("Password: password123");
    console.log("Name: Sarah Johnson");
    console.log("Department: Marketing");
    console.log("Designation: Marketing Specialist");
    console.log("================================");
    console.log("Employee ID: EMP003");
    console.log("Email: david.chen@synapt.com");
    console.log("Password: password123");
    console.log("Name: David Chen");
    console.log("Department: Engineering");
    console.log("Designation: Frontend Developer");
    console.log("================================");
    console.log(
      "\n🔑 Use these credentials to test the employee onboarding process!"
    );
  } catch (error) {
    console.error("❌ Error creating sample employees:", error);
  }
};

const runScript = async () => {
  await connectDb();
  await createSampleEmployees();
  process.exit(0);
};

runScript();
