const express = require("express")
const {register, login, currentUser, verifyOtp} = require("../controllers/authController")
const currentUserToken = require("../middlewares/currentUserMiddleware")
const router = express.Router()


router.post("/register", register)
router.post("/login", login)
router.get("/current", currentUserToken, currentUser)
router.post("/verify-otp",verifyOtp)




module.exports = router 