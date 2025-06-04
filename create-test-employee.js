// Script to create a test employee in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import the existing Employee model
const Employee = require('./models/employeeSchema');

async function createTestEmployee() {
  try {    // Connect to MongoDB using the same connection string as server
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aihrms');
    console.log('Connected to MongoDB');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test employee
    const testEmployee = new Employee({
      name: 'Test Employee',
      email: 'test@company.com',
      phone: '1234567890',
      department: 'IT',
      designation: 'Software Developer',
      joiningDate: new Date(),
      role: 'employee',
      status: 'active',
      password: hashedPassword,
      employeeId: 'EMP001',
      isFirstLogin: true, // This will redirect to onboarding after login
      lastLogin: null
    });

    await testEmployee.save();
    console.log('✅ Test employee created successfully!');
    console.log('🔑 Login credentials:');
    console.log('   Employee ID: EMP001');
    console.log('   Password: password123');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Make sure your backend server is running (npm start)');
    console.log('2. Go to http://localhost:3000/employee/auth/signin');
    console.log('3. Login with the above credentials');
    console.log('4. You will be redirected to onboarding page with a valid token');
    
  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  Test employee already exists! Use existing credentials:');
      console.log('   Employee ID: EMP001');
      console.log('   Password: password123');
    } else {
      console.error('❌ Error creating test employee:', error);
    }
  } finally {
    mongoose.connection.close();
  }
}

createTestEmployee();
