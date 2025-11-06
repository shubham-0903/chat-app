const mongoose = require("mongoose");

// Document auto-expires using TTL index
const blockedUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  blockedAt: { type: Date, default: Date.now },
  reason: { type: String, default: "Exceeded violation threshold" },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

module.exports = mongoose.model("BlockedUser", blockedUserSchema);
