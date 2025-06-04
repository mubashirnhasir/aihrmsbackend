const express = require("express");
const dotenv = require("dotenv").config();
const connectDb = require("./config/dbConnection");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const userRoutes = require("./routes/userRoutes");
const assetRoutes = require("./routes/assetRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();
const port = process.env.PORT || 5001;


app.use(cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Connect DB
connectDb();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", userRoutes); 
app.use("/api/assets", assetRoutes);

// Static files
app.use("/api/employee", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/uploads", express.static("uploads"));

//start the server
app.listen(port, (req, res) => {
  console.log(`Listining on port number ${port}`);
});