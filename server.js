const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv").config();
const port = process.env.PORT || 5000;
const connectDb = require("./config/dbConnection");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

//middlewares
app.use(cors());
app.use(express.json());

// database connetction
connectDb();
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/uploads", express.static("uploads"));

//start the server
app.listen(port, (req, res) => {
  console.log(`Listining on port number ${port}`);
});