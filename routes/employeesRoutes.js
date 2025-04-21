const express = require("express")
const {
    createEmployee,
    getAllEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employeeController")
const upload = require("../middlewares/uploadMiddleware")
const employeeRoutes = express.Router()

employeeRoutes.route('/').get(getAllEmployees).post(upload.single("profilePicture"),createEmployee)
employeeRoutes.route('/:id').get(getEmployee).put(upload.single("profilePicture") ,updateEmployee).delete(deleteEmployee)

module.exports = employeeRoutes;