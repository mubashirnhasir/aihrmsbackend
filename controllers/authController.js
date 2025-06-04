const User = require("../models/employeeSchema");
const Employee = require("../models/employeeSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto")
const sendMail = require("../utils/forgotPasswordMail")
const sendOtpEmail = require("../utils/sendMail");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp()

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // ✅ 10 mins
      isVerified: false // ✅ MUST explicitly add this
    });
    await newUser.save();
    await sendOtpEmail(email, name, otp)
    res
      .status(201)
      .json({ message: `User Registered with email ${email}` });

  } catch (error) {
    res.status(500).json({ message: `Yeich hai Went wrong ${error}` });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("🔐 Input OTP:", otp);
    console.log("📦 Stored OTP:", user.otp);
    console.log("📅 Expires At:", user.otpExpires);
    console.log("⏱️ Current Time:", Date.now());

    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ message: "OTP verified", token });

  } catch (err) {
    console.log("OTP verification error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: `No user found ${email}` });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(400).json({ message: `Invalid Credentials` });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1day" }
    );

    console.log(token);

    res
      .status(200)
      .json({ message: ` You have Successfully logged in ${email}`, token });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const currentUser = async (req, res) => {
  try {
    const existingUser = await User.findById(req.user.id).select("-password")
    if (!existingUser) {
      res.status(401).json({ message: "User not found" })
    }
    res.status(200).json({ message: `The current user is `, user: existingUser })

  } catch (error) {
    console.log("Error getting current user");
    res.status(500).json({ message: "Server error" });
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "No user found by given email" })
    }

    const otp = generateOtp()
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 2000
    await user.save()

    await sendMail(email, user.name, otp); // reuse the same Mailgen style
    res.status(200).json({ message: "OTP sent to your email." });

  } catch (error) {
    console.log("Forgot password error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

const resetPassword = async (req, res) => {
  try {
    const {email,otp , newPassword} =req.body

    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: {$gt: Date.now() }
    })

    if(!user){
      return res.status(400).json({message: "Invalid or expired OTP" })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    user.otp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.status(200).json({message: "Password reset successfully"})

  } catch (error) {
    console.log("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Employee-specific authentication methods
const employeeSignin = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ message: "Employee ID and password are required" });
    }

    // Find employee by employeeId or email
    const employee = await Employee.findOne({
      $or: [
        { employeeId: employeeId },
        { email: employeeId }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if employee has a password set
    if (!employee.password) {
      return res.status(400).json({ 
        message: "Account not activated. Please contact HR to set up your password.",
        requiresActivation: true
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: employee._id, 
        employeeId: employee.employeeId,
        role: 'employee',
        isFirstLogin: employee.isFirstLogin
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        designation: employee.designation,
        department: employee.department,
        isFirstLogin: employee.isFirstLogin
      }
    });

  } catch (error) {
    console.error("Employee signin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const employeeCurrentUser = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("-password");
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Current employee retrieved successfully",
      employee: employee
    });

  } catch (error) {
    console.error("Error getting current employee:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login, register, currentUser, verifyOtp, forgotPassword, resetPassword, employeeSignin, employeeCurrentUser };
