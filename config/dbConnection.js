const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    console.log("🔍 MONGO_URI:", process.env.MONGO_URI); // Debug line
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      "✅ Database Connected Successfully:",
      connect.connection.host,
      connect.connection.name
    );
  } catch (error) {
    console.error("❌ Error in connecting the database", error);
    process.exit(1);
  }
};

module.exports = connectDb;
