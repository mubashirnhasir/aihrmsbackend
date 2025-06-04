const mongoose = require('mongoose');
const Employee = require('./models/employeeSchema');
require('dotenv').config();

async function updateLeaveBalance() {
  try {
    // Connect to MongoDB using the same connection string as the server
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Update all employees' leave balances to the new defaults
    const result = await Employee.updateMany(
      {}, // Update all employees
      {
        $set: {
          casualLeaves: 1,
          sickLeaves: 2,
          earnedLeaves: 1,
          unpaidLeaves: 0
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} employees with new leave balances`);
    
    // Verify the update for our test employee
    const testEmployee = await Employee.findOne({ employeeId: 'EMP001' });
    if (testEmployee) {
      console.log('Test employee leave balances:', {
        casual: testEmployee.casualLeaves,
        sick: testEmployee.sickLeaves,
        earned: testEmployee.earnedLeaves,
        unpaid: testEmployee.unpaidLeaves
      });
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating leave balances:', error);
    process.exit(1);
  }
}

updateLeaveBalance();
