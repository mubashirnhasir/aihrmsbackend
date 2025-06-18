const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const testConnection = async () => {
  try {
    console.log("🔍 Testing MongoDB Connection...");
    console.log("🔍 MONGO_URI:", process.env.MONGO_URI);
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    };
    
    const connect = await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB Connected Successfully!");
    console.log("Host:", connect.connection.host);
    console.log("Database:", connect.connection.name);
    console.log("Ready State:", connect.connection.readyState);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("📋 Available Collections:", collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log("✅ Connection test completed successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log("\n🔧 Troubleshooting suggestions:");
      console.log("1. Check your internet connection");
      console.log("2. Verify MongoDB Atlas cluster is running");
      console.log("3. Check if your IP address is whitelisted in MongoDB Atlas");
      console.log("4. Try connecting with MongoDB Compass using the same URI");
      console.log("5. Check if there are any firewall restrictions");
    }
    
    process.exit(1);
  }
};

testConnection();
