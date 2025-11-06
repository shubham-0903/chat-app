const mongoose = require("mongoose");

const strikeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  strikeCount: { type: Number, default: 0 },
  totalBlocks: { type: Number, default: 0 },
  lastStrikeAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Strike", strikeSchema);
