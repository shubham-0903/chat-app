const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === "test") {
      logger.info("Skipping real MongoDB connection (test mode)");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
