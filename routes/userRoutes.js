const express = require("express");
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeByName,
} = require("../controllers/userController"); // ✅ from authController

const userRoutes = express.Router();

userRoutes.route("/").get(getAllEmployees).post(createEmployee);

// Profile route for fetching by name (for career development)
userRoutes.get("/profile", getEmployeeByName);

userRoutes
  .route("/:id")
  .get(getEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee);

module.exports = userRoutes;
