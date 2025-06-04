const Asset = require("../models/assetSchema");

const createAsset = async (req, res) => {
  try {
    const assetData = req.body;

    const existing = await Asset.findOne({ assetId: assetData.assetId });
    if (existing) {
      return res.status(409).json({ message: "Asset ID already exists." });
    }

    const asset = await Asset.create(assetData);
    res.status(201).json({ message: "Asset created successfully", asset });
  } catch (error) {
    console.error("createAsset →", error);
    res.status(500).json({ message: "Failed to create asset" });
  }
};

const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assets" });
  }
};

module.exports = { createAsset, getAllAssets };
