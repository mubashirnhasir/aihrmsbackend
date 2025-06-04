const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  casual: {
    total: { type: Number, default: 12 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 12 }
  },
  sick: {
    total: { type: Number, default: 12 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 12 }
  },
  earned: {
    total: { type: Number, default: 21 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 21 }
  },
  unpaid: {
    total: { type: Number, default: 365 }, // Unlimited but tracked
    used: { type: Number, default: 0 },
    available: { type: Number, default: 365 }
  },
  maternity: {
    total: { type: Number, default: 180 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 180 }
  },
  paternity: {
    total: { type: Number, default: 15 },
    used: { type: Number, default: 0 },
    available: { type: Number, default: 15 }
  },
  carryForward: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
leaveBalanceSchema.index({ employeeId: 1, year: 1 });

// Method to update leave balance when leave is approved
leaveBalanceSchema.methods.updateBalance = function(leaveType, duration, operation = 'deduct') {
  if (this[leaveType]) {
    if (operation === 'deduct') {
      this[leaveType].used += duration;
      this[leaveType].available = Math.max(0, this[leaveType].total - this[leaveType].used);
    } else if (operation === 'add') {
      this[leaveType].used = Math.max(0, this[leaveType].used - duration);
      this[leaveType].available = this[leaveType].total - this[leaveType].used;
    }
    this.lastUpdated = new Date();
  }
};

// Static method to initialize leave balance for new employee
leaveBalanceSchema.statics.initializeForEmployee = async function(employeeId, year = null) {
  const currentYear = year || new Date().getFullYear();
  
  const existingBalance = await this.findOne({ 
    employeeId: employeeId, 
    year: currentYear 
  });
  
  if (!existingBalance) {
    const newBalance = new this({
      employeeId: employeeId,
      year: currentYear
    });
    return await newBalance.save();
  }
  
  return existingBalance;
};

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
