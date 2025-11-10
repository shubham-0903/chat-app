const mongoose = require("mongoose");
const dotenv = require("dotenv");
const InternalUser = require("./src/models/internalUser");

dotenv.config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" Connected to MongoDB");

    const existing = await InternalUser.findOne({ email: "admin@gmail.com" });
    if (existing) {
      console.log("Admin user already exists.");
      process.exit(0);
    }

    const admin = new InternalUser({
      name: "Admin",
      email: "admin@gmail.com",
      password: "admin123"
    });
    await admin.save();

    console.log(" Default admin user created successfully!");
    process.exit(0);
  } catch (err) {
    console.error(" Error seeding admin:", err);
    process.exit(1);
  }
}

seedAdmin();
