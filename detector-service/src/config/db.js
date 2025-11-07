const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "chat-app",
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.log("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
