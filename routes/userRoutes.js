const express = require("express")
const router = express.Router()
const verifyToken = require("../middlewares/authMiddleware")
const authorizeRoles = require("../middlewares/roleMiddleware")
// only for admin
router.get("/admin", verifyToken, authorizeRoles("admin"), (req,res)=>{
    res.json({message:"welcome admin"})
})


// only for manager and admin
router.get("/manager", verifyToken, authorizeRoles("admin", "manager"), (req,res)=>{
        res.json({message:"welcome manager"})
})


// all can access this
router.get("/user", verifyToken,(req,res)=>{
        res.json({message:"welcome user"})
})


module.exports = router




