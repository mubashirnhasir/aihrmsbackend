const User = require("../models/userSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  console.log("Hittt Ho gayaayayayaaaa");
  try {
    const { email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, role });
    await newUser.save();
    res
      .status(201)
      .json({ message: `User Registered with email ${email}` });
  } catch (error) {
    res.status(500).json({ message: `Something Went wrong ${error}` });
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



module.exports = { login, register, currentUser };
