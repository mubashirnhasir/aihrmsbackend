// Script to create multiple test employees with different scenarios
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./models/employeeSchema');

async function createMultipleTestEmployees() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testEmployees = [
      {
        name: 'New Employee (Onboarding)',
        email: 'newbie@company.com',
        employeeId: 'EMP002',
        password: hashedPassword,
        isFirstLogin: true, // Will go to onboarding
        department: 'Marketing',
        designation: 'Marketing Specialist'
      },
      {
        name: 'Existing Employee (Dashboard)',
        email: 'veteran@company.com', 
        employeeId: 'EMP003',
        password: hashedPassword,
        isFirstLogin: false, // Will go to dashboard
        department: 'HR',
        designation: 'HR Manager'
      },
      {
        name: 'Senior Developer',
        email: 'senior@company.com',
        employeeId: 'EMP004', 
        password: hashedPassword,
        isFirstLogin: true, // Will go to onboarding
        department: 'IT',
        designation: 'Senior Software Developer'
      }
    ];

    for (const emp of testEmployees) {
      try {
        await new Employee({
          ...emp,
          phone: '1234567890',
          joiningDate: new Date(),
          role: 'employee',
          status: 'active',
          lastLogin: null
        }).save();
        
        console.log(`✅ Created: ${emp.name} (${emp.employeeId})`);
        console.log(`   First Login: ${emp.isFirstLogin ? 'Yes (→ Onboarding)' : 'No (→ Dashboard)'}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  ${emp.name} already exists`);
        }
      }
    }

    console.log('\n🔑 All test employees use password: password123');
    console.log('\n📋 Test Scenarios:');
    console.log('EMP001 (Test Employee) → Onboarding');
    console.log('EMP002 (New Employee) → Onboarding'); 
    console.log('EMP003 (Existing Employee) → Dashboard');
    console.log('EMP004 (Senior Developer) → Onboarding');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMultipleTestEmployees();
