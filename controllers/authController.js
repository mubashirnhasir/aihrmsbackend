const User = require("../models/employeeSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtpEmail = require("../utils/sendMail");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
};


const register = async (req, res) => {
  try {
    const {  name,
      email,
      password,
      phone,
      department,
      designation,
      role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp()

    const newUser = new User({
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // ✅ 10 mins
      isVerified: false // ✅ MUST explicitly add this
    });
    await newUser.save();
    await sendOtpEmail(email, email, otp)
    res
      .status(201)
      .json({ message: `User Registered with email ${email}` });

  } catch (error) {
    res.status(500).json({ message: `Something Went wrong ${error}` });
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

const currentUser = async (req,res)=>{
    try {
        const existingUser = await User.findById(req.user.id).select("-password")
        if(!existingUser){
            res.status(401).json({message:"User not found"})
        }
        res.status(200).json({message:`The current user is `, user: existingUser })
        
    } catch (error) {
        console.log("Error getting current user");
        res.status(500).json({ message: "Server error" });
    }
}



module.exports = { login, register, currentUser, verifyOtp};
