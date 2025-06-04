const express = require("express")
const {register, login, currentUser, verifyOtp, forgotPassword ,resetPassword, employeeSignin, employeeCurrentUser} = require("../controllers/authController")
const currentUserToken = require("../middlewares/currentUserMiddleware")
const router = express.Router()


router.post("/register", register)
router.post("/login", login)
router.get("/current", currentUserToken, currentUser)
router.post("/verify-otp",verifyOtp)
router.post("/forgot-password", forgotPassword);
router.post("/rest-password", resetPassword);

// Employee-specific authentication routes
router.post("/employee/signin", employeeSignin);
router.get("/employee/current", currentUserToken, employeeCurrentUser);



module.exports = router