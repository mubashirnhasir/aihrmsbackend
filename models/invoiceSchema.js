const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [{
    description: String,
    quantity: Number,
    amount: Number
  }],
  currency: {
    type: String,
    default: "USD"
  },
  subtotal: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue'],
    default: 'draft'
  },  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and string for placeholder admin
    ref: 'User',
    required: true
  },
  pdfData: {
    type: String // Store base64 PDF data
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Invoice", invoiceSchema);
