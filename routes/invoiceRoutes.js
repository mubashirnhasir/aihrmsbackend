const express = require("express");
const mongoose = require("mongoose");
const Invoice = require("../models/invoiceSchema");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// @desc Create new invoice
// @route POST /api/invoices
// @access Private
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      invoiceDate,
      dueDate,
      items,
      currency,
      notes,
      pdfData,
    } = req.body; // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.amount,
      0
    );
    const total = subtotal; // Add tax calculation here if needed    // Handle createdBy field - for placeholder admin token, use string directly
    let createdBy = req.user.id;
    if (typeof createdBy === "string" && createdBy === "admin") {
      // Keep as string for placeholder admin
      createdBy = "admin";
    }

    const invoice = new Invoice({
      invoiceNumber,
      clientName,
      clientEmail,
      invoiceDate,
      dueDate,
      items,
      currency,
      subtotal,
      total,
      notes,
      pdfData,
      createdBy: createdBy,
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Invoice number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
  }
});

// @desc Get all invoices
// @route GET /api/invoices
// @access Private
router.get("/", async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: invoices.length,
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
});

// @desc Get single invoice
// @route GET /api/invoices/:id
// @access Private
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
});

// @desc Download invoice PDF
// @route GET /api/invoices/:id/download
// @access Private
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (!invoice.pdfData) {
      return res.status(404).json({
        success: false,
        message: "PDF data not found for this invoice",
      });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(invoice.pdfData, "base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error downloading invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download invoice",
      error: error.message,
    });
  }
});

// @desc Update invoice
// @route PUT /api/invoices/:id
// @access Private
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Update only allowed fields
    const updateFields = ["status", "notes", "dueDate"];
    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    await invoice.save();

    res.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
});

// @desc Delete invoice
// @route DELETE /api/invoices/:id
// @access Private
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
});

module.exports = router;
