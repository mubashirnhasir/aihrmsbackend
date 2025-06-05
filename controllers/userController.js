const Employee = require("../models/employeeSchema");

const createEmployee = async (req, res) => {
  try {
    const data = req.body;
    const profilePath = req.file
      ? req.file.path.replace(/\\/g, "/")
      : "uploads/profile.png";
    const employee = await Employee.create({
      ...data,
      profilePicture: profilePath,
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllEmployees = async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
};

const getEmployee = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
};

const updateEmployee = async (req, res) => {
  try {
    const updatedData = { ...req.body };

    if (req.file) {
      updatedData.profilePicture = req.file.path;
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.json({ message: "Employee deleted successfully" });
};

const getEmployeeByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Name parameter is required" });
    }

    const employee = await Employee.findOne({ name: name });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee by name:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeByName,
};
