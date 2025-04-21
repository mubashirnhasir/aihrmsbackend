const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const port = process.env.PORT || 5001;
const connectDb = require("./config/dbConnection");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const employeesRoutes = require("./routes/employeesRoutes");


//middlewares
app.use(express.json());

// database connetction
connectDb();
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/uploads", express.static("uploads"));


//start the server

app.listen(port, (req, res) => {
  console.log(`Listining on port number ${port}`);
});
