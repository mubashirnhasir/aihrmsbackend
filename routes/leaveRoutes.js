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

    // Find leave request
    const leaveRequest = await LeaveRequest.findById(requestId);
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

    // Update leave request
    leaveRequest.status = status;
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.approvedAt = new Date();
    
    if (status === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason || '';
    }

    await leaveRequest.save();

    // If approved, update leave balance
    if (status === 'approved') {
      const currentYear = new Date().getFullYear();
      let leaveBalance = await LeaveBalance.findOne({ 
        employeeId: leaveRequest.employeeId, 
        year: currentYear 
      });

      if (!leaveBalance) {
        leaveBalance = await LeaveBalance.initializeForEmployee(leaveRequest.employeeId, currentYear);
      }

      // Update balance
      leaveBalance.updateBalance(leaveRequest.leaveType, leaveRequest.duration, 'deduct');
      await leaveBalance.save();
    }

    // Populate employee details
    await leaveRequest.populate('employeeId', 'name email department');
    await leaveRequest.populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: leaveRequest
    });

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
router.get('/pending', async (req, res) => {
  try {
    const { department, limit = 50, page = 1 } = req.query;

    // Build query
    let query = { status: 'pending' };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get pending leave requests
    let leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'name email department designation')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Filter by department if specified
    if (department && department !== 'all') {
      leaveRequests = leaveRequests.filter(req => 
        req.employeeId && req.employeeId.department === department
      );
    }

    // Get total count
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
    console.error('Error fetching pending leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending leave requests',
      error: error.message
    });
  }
});

module.exports = router;
