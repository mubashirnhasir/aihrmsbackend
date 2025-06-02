const express = require("express");
const dotenv = require("dotenv").config();
const connectDb = require("./config/dbConnection");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const employeeRouter = require("./routes/employeeRoutes");

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
app.use("/api/employees", employeeRouter); // ✅ DO NOT include non-existent userRoutes

// Static files
app.use("/uploads", express.static("uploads"));

// Start server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
