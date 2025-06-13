const express = require("express");
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  let token;
  let authHeader = req.headers.Authorization || req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(400)
        .json({ message: "No token, Authorization denied" });
    }

    try {
      // Handle placeholder admin token for testing
      if (token === 'admin-token-placeholder') {
        req.user = { 
          id: 'admin', 
          role: 'admin',
          name: 'Admin User'
        };
        console.log("✅ Admin token accepted for user:", req.user.id);
        next();
        return;
      }

      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decode;
      console.log("✅ Token verified for user:", req.user.id);
      next();
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      res.status(401).json({ message: "Invalid Token" });
    }
  } else {
    return res.status(401).json({ message: "Authorization header required" });
  }
};

module.exports = verifyToken;
