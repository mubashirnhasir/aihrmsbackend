const express = require("express");
const { createAsset, getAllAssets } = require("../controllers/assetsController");

const assetRoutes = express.Router();

assetRoutes.route("/").get(getAllAssets).post(createAsset);

module.exports = assetRoutes;
