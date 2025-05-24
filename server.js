// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDb = require("./config/dbConnection");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

const app = express();
const PORT = process.env.PORT; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDb();
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
