const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    console.log("🔍 MONGO_URI:", process.env.MONGO_URI); // Debug line
    
    // MongoDB connection options (simplified and working)
    const options = {
      serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    const connect = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(
      "✅ Database Connected Successfully:",
      connect.connection.host,
      connect.connection.name
    );
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });
    
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
  } catch (error) {
    console.error("❌ Error in connecting the database", error);
    
    if (error.code === 'ETIMEDOUT') {
      console.log("\n🔧 Network timeout detected. This could be due to:");
      console.log("1. Internet connectivity issues");
      console.log("2. MongoDB Atlas cluster not accessible from your network");
      console.log("3. IP address not whitelisted in MongoDB Atlas");
      console.log("4. Firewall blocking the connection");
      console.log("\n💡 Consider using a local MongoDB instance for development");
      console.log("📖 See MONGODB_SETUP.md for quick setup options");
    }
    
    // Retry connection after 10 seconds instead of exiting immediately
    console.log("🔄 Retrying database connection in 10 seconds...");
    setTimeout(() => {
      connectDb();
    }, 10000);
  }
};

module.exports = connectDb;
