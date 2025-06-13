const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/leaveRequestSchema');
const LeaveBalance = require('../models/leaveBalanceSchema');
const Employee = require('../models/employeeSchema');

// @desc Submit a new leave request
// @route POST /api/leave/request
// @access Private (Employee)
router.post('/request', async (req, res) => {
  try {
    const {
      employeeId,
      leaveType,
      startDate,
      endDate,
      isHalfDay,
      halfDayType,
      reason,
      emergencyContact,
      attachments
    } = req.body;

    // Validate required fields
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    let duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (isHalfDay) {
      duration = 0.5;
    }

    // Validate dates
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await LeaveBalance.findOne({ 
      employeeId: employeeId, 
      year: currentYear 
    });

    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.initializeForEmployee(employeeId, currentYear);
    }

    // Check if employee has sufficient leave balance (except for unpaid leave)
    if (leaveType !== 'unpaid' && leaveBalance[leaveType]) {
      if (leaveBalance[leaveType].available < duration) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} leave balance. Available: ${leaveBalance[leaveType].available} days, Requested: ${duration} days`
        });
      }
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      isHalfDay: isHalfDay || false,
      halfDayType: halfDayType || 'morning',
      duration,
      reason,
      emergencyContact: emergencyContact || '',
      attachments: attachments || '',
      status: 'pending'
    });

    const savedRequest = await leaveRequest.save();

    // Populate employee details
    await savedRequest.populate('employeeId', 'name email department');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: savedRequest
    });

  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: error.message
    });
  }
});

// @desc Get all leave requests for admin (with filters)
// @route GET /api/leave/requests/all
// @access Private (Admin/HR)
router.get('/requests/all', async (req, res) => {
  try {
    const { status, department, limit = 50, page = 1, year } = req.query;

    // Build query for employees with leave requests
    let employeeQuery = {};
    
    if (department && department !== 'all') {
      employeeQuery.department = department;
    }

    // Get all employees with leave requests
    const employees = await Employee.find(employeeQuery).select('name email department designation leaveRequests');

    // Extract and flatten all leave requests
    let allRequests = [];
    
    employees.forEach(employee => {
      const empRequests = employee.leaveRequests.map(req => ({
        ...req.toObject(),
        _id: req._id,
        employeeId: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          designation: employee.designation
        }
      }));
      
      allRequests = allRequests.concat(empRequests);
    });

    // Filter by status if specified
    if (status && status !== 'all') {
      allRequests = allRequests.filter(req => req.status === status);
    }

    // Filter by year if specified
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      allRequests = allRequests.filter(req => {
        const startDate = new Date(req.startDate);
        return startDate >= startOfYear && startDate <= endOfYear;
      });
    }

    // Sort by appliedOn date (most recent first)
    allRequests.sort((a, b) => new Date(b.appliedOn || b.createdAt) - new Date(a.appliedOn || a.createdAt));

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRequests = allRequests.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(allRequests.length / parseInt(limit)),
        count: paginatedRequests.length,
        totalRecords: allRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
});

// @desc Get leave requests for an employee
// @route GET /api/leave/requests/:employeeId
// @access Private (Employee)
router.get('/requests/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, year, limit = 50, page = 1 } = req.query;

    // Build query
    let query = { employeeId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get leave requests with pagination
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'name email department')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await LeaveRequest.countDocuments(query);

    res.json({
      success: true,
      data: leaveRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: leaveRequests.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
});

// @desc Get leave balance for an employee
// @route GET /api/leave/balance/:employeeId
// @access Private (Employee)
router.get('/balance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get or create leave balance
    let leaveBalance = await LeaveBalance.findOne({ 
      employeeId: employeeId, 
      year: currentYear 
    });

    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.initializeForEmployee(employeeId, currentYear);
    }

    res.json({
      success: true,
      data: leaveBalance
    });

  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message
    });
  }
});

// @desc Update leave request status (Approve/Reject)
// @route PUT /api/leave/request/:requestId/status
// @access Private (Manager/HR)
router.put('/request/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, approvedBy, rejectionReason } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected"'
      });
    }

    // Find employee with the leave request
    const employee = await Employee.findOne({
      'leaveRequests._id': requestId
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Find the specific leave request
    const leaveRequest = employee.leaveRequests.id(requestId);
    
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if already processed
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leaveRequest.status}`
      });
    }

    // Update leave request status
    leaveRequest.status = status;
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.approvedAt = new Date();
    
    if (status === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason || '';
    }

    // If approved, update leave balance in the employee document
    if (status === 'approved') {
      const leaveType = leaveRequest.type;
      const duration = Math.ceil((new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      if (leaveRequest.halfDay) {
        duration = 0.5;
      }

      // Update employee leave balances
      switch (leaveType) {
        case 'casual':
          employee.casualLeaves = Math.max(0, (employee.casualLeaves || 1) - duration);
          break;
        case 'sick':
          employee.sickLeaves = Math.max(0, (employee.sickLeaves || 2) - duration);
          break;
        case 'earned':
          employee.earnedLeaves = Math.max(0, (employee.earnedLeaves || 1) - duration);
          break;
        case 'unpaid':
          employee.unpaidLeaves = (employee.unpaidLeaves || 0) + duration;
          break;
      }
    }

    await employee.save();

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: {
        ...leaveRequest.toObject(),
        employeeId: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          department: employee.department
        }
      }    });

  } catch (error) {
    console.error('Error updating leave request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request status',
      error: error.message
    });
  }
});

// @desc Cancel leave request (Employee only, if pending)
// @route PUT /api/leave/request/:requestId/cancel
// @access Private (Employee)
router.put('/request/:requestId/cancel', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { employeeId } = req.body;

    // Find leave request
    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if employee owns this request
    if (leaveRequest.employeeId.toString() !== employeeId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave requests'
      });
    }

    // Check if request can be cancelled
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${leaveRequest.status} leave request`
      });
    }

    // Update status to cancelled
    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leaveRequest
    });

  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: error.message
    });
  }
});

// @desc Get all pending leave requests (for managers/HR)
// @route GET /api/leave/pending
// @access Private (Manager/HR)
// @desc Get pending leave requests for admin
// @route GET /api/leave/pending
// @access Private (Admin/HR)
router.get('/pending', async (req, res) => {
  try {
    const { department, limit = 50, page = 1 } = req.query;

    // Get all employees with pending leave requests
    const employees = await Employee.find({
      'leaveRequests.status': 'pending'
    }).select('name email department designation leaveRequests');

    // Extract and flatten all pending leave requests
    let pendingRequests = [];
    
    employees.forEach(employee => {
      const empPendingRequests = employee.leaveRequests
        .filter(req => req.status === 'pending')
        .map(req => ({
          ...req.toObject(),
          _id: req._id,
          employeeId: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            designation: employee.designation
          }
        }));
      
      pendingRequests = pendingRequests.concat(empPendingRequests);
    });

    // Filter by department if specified
    if (department && department !== 'all') {
      pendingRequests = pendingRequests.filter(req => 
        req.employeeId && req.employeeId.department === department
      );
    }

    // Sort by appliedOn date (most recent first)
    pendingRequests.sort((a, b) => new Date(b.appliedOn || b.createdAt) - new Date(a.appliedOn || a.createdAt));

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRequests = pendingRequests.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(pendingRequests.length / parseInt(limit)),
        count: paginatedRequests.length,
        totalRecords: pendingRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching pending leave requests:', error);
    res.status(500).json({
      success: false,      message: 'Failed to fetch pending leave requests',
      error: error.message
    });
  }
});

// @desc Get employees on leave today
// @route GET /api/leaves/on-leave-today
// @access Private (HR/Manager)
router.get('/on-leave-today', async (req, res) => {
  try {
    // Get today's date in the local timezone (India Standard Time)
    const today = new Date();
    const todayIST = new Date(today.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
    todayIST.setHours(0, 0, 0, 0);
    
    // Create date range for today in IST
    const startOfToday = new Date(todayIST);
    const endOfToday = new Date(todayIST);
    endOfToday.setHours(23, 59, 59, 999);

    // Find employees with approved leave requests for today
    const employeesOnLeave = await Employee.find({
      'leaveRequests': {
        $elemMatch: {
          status: 'approved',
          startDate: { $lte: endOfToday },
          endDate: { $gte: startOfToday }
        }
      }
    }).select('name email department designation profilePicture leaveRequests');

    // Format the response data
    const formattedData = [];    employeesOnLeave.forEach(employee => {
      // Find the current active leave request for this employee
      const activeLeave = employee.leaveRequests.find(leave => {
        if (leave.status !== 'approved') return false;
        
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        
        // Check if today falls within the leave period
        return leaveStart <= endOfToday && leaveEnd >= startOfToday;
      });

      if (activeLeave) {
        formattedData.push({
          id: activeLeave._id,
          employeeId: employee._id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          designation: employee.designation,
          profilePicture: employee.profilePicture,
          leaveType: activeLeave.type,
          startDate: activeLeave.startDate,
          endDate: activeLeave.endDate,
          duration: activeLeave.duration || calculateDuration(activeLeave.startDate, activeLeave.endDate),
          isHalfDay: activeLeave.halfDay || false,
          halfDayType: activeLeave.halfDayType || null
        });
      }
    });

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    });

  } catch (error) {
    console.error('Error fetching employees on leave today:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees on leave today',
      error: error.message
    });
  }
});

// Helper function to calculate duration
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
}

module.exports = router;
