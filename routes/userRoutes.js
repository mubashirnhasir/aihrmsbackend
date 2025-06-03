const express = require("express");
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee
} = require("../controllers/userController"); // ✅ from authController

const userRoutes = express.Router();

userRoutes.route("/")
  .get(getAllEmployees)
  .post(createEmployee);

userRoutes.route("/:id")
  .get(getEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee);

module.exports = userRoutes;
