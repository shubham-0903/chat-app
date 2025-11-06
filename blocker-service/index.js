const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { startStrikeConsumer } = require("./src/consumers/strikeConsumer.js");


dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await startStrikeConsumer();
  } catch (error) {
    console.error("Blocker service failed:", error);
  }
})();
