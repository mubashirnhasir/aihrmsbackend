const express = require("express")
const app = express()
const dotenv = require("dotenv").config()
const port = process.env.PORT || 5001
const connectDb = require("./config/dbConnection")

connectDb()
app.use(express.urlencoded({extended: true}))


app.listen(port ,(req,res)=>{
    console.log(`Listining on port number ${port}`);
})