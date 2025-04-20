const express = require("express")
const {register, login, currentUser} = require("../controllers/authController")
const currentUserToken = require("../middlewares/currentUserMiddleware")
const router = express.Router()


router.post("/register", register)
router.post("/login", login)
router.get("/current", currentUserToken, currentUser)




module.exports = router 