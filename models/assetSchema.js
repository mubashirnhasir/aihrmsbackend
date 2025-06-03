const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    assetId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    assignedTo: { type: String },
    createdAt: { type: Date, required: true },
    department: { type: String },
    status: { type: String, default: "Available" },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", assetSchema, "assets");
