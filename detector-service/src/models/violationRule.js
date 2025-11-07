const mongoose = require("mongoose");

const violationRuleSchema = new mongoose.Schema({
  type: { type: String, required: true }, 
  words: { type: [String], required: true },
  message: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ViolationRule", violationRuleSchema);
