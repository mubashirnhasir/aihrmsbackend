const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const Employee = require('./models/employeeSchema');
const LeaveRequest = require('./models/leaveRequestSchema');

// Connect to MongoDB using the same config as the main server
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Sample employees data
const sampleEmployees = [
  {
    name: 'Ayesha Siddiqui',
    email: 'ayesha.siddiqui@company.com',
    department: 'Engineering',
    designation: 'Senior Developer',
    profilePicture: null
  },
  {
    name: 'Ravi Kumar',
    email: 'ravi.kumar@company.com',
    department: 'Marketing',
    designation: 'Marketing Manager',
    profilePicture: null
  },
  {
    name: 'Meera Singh',
    email: 'meera.singh@company.com',
    department: 'HR',
    designation: 'HR Specialist',
    profilePicture: null
  },
  {
    name: 'John Carter',
    email: 'john.carter@company.com',
    department: 'Engineering',
    designation: 'DevOps Engineer',
    profilePicture: null
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    department: 'Finance',
    designation: 'Financial Analyst',
    profilePicture: null
  }
];

// Create leave requests that include today (June 13, 2025)
const createSampleData = async () => {
  try {
    console.log('Creating sample employees and leave data...');
    
    // Clear existing data
    await Employee.deleteMany({});
    await LeaveRequest.deleteMany({});
    
    // Create employees
    const employees = await Employee.create(sampleEmployees);
    console.log(`Created ${employees.length} employees`);
    
    // Current date is June 13, 2025
    const today = new Date('2025-06-13');
    
    // Create leave requests that include today
    const leaveRequests = [
      {
        employeeId: employees[0]._id, // Ayesha Siddiqui
        leaveType: 'earned',
        startDate: new Date('2025-06-12'), // June 12-15
        endDate: new Date('2025-06-15'),
        duration: 4,
        reason: 'Family vacation planned in advance',
        status: 'approved',
        isHalfDay: false
      },
      {
        employeeId: employees[1]._id, // Ravi Kumar
        leaveType: 'sick',
        startDate: new Date('2025-06-13'), // June 13 only
        endDate: new Date('2025-06-13'),
        duration: 1,
        reason: 'Feeling unwell, need to rest',
        status: 'approved',
        isHalfDay: false
      },
      {
        employeeId: employees[2]._id, // Meera Singh
        leaveType: 'casual',
        startDate: new Date('2025-06-11'), // June 11-14
        endDate: new Date('2025-06-14'),
        duration: 4,
        reason: 'Personal work needs attention',
        status: 'approved',
        isHalfDay: false
      },
      {
        employeeId: employees[3]._id, // John Carter
        leaveType: 'earned',
        startDate: new Date('2025-06-13'), // June 13 (half day)
        endDate: new Date('2025-06-13'),
        duration: 0.5,
        reason: 'Medical appointment in the morning',
        status: 'approved',
        isHalfDay: true,
        halfDayType: 'morning'
      },
      // This one should NOT appear (not approved)
      {
        employeeId: employees[4]._id, // Priya Sharma
        leaveType: 'casual',
        startDate: new Date('2025-06-13'),
        endDate: new Date('2025-06-14'),
        duration: 2,
        reason: 'Personal work',
        status: 'pending', // Not approved, should not show
        isHalfDay: false
      }
    ];
    
    const createdLeaves = await LeaveRequest.create(leaveRequests);
    console.log(`Created ${createdLeaves.length} leave requests`);
    
    // Verify the data
    const onLeaveToday = await LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('employeeId', 'name email department');
    
    console.log('\nEmployees on leave today (June 13, 2025):');
    onLeaveToday.forEach(leave => {
      console.log(`- ${leave.employeeId.name} (${leave.leaveType}) - ${leave.employeeId.department}`);
    });
    
    console.log('\nSample data created successfully!');
    console.log('You should see 4 employees on leave today in the dashboard.');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run the script
connectDB().then(() => {
  createSampleData();
});
