const express = require("express")
const {register, login, currentUser, verifyOtp, forgotPassword ,resetPassword} = require("../controllers/authController")
const currentUserToken = require("../middlewares/currentUserMiddleware")
const router = express.Router()


router.post("/register", register)
router.post("/login", login)
router.get("/current", currentUserToken, currentUser)
router.post("/verify-otp",verifyOtp)
router.post("/forgot-password", forgotPassword);
router.post("/rest-password", resetPassword);




module.exports = router 