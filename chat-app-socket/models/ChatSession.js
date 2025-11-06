const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  participants: [{ userId: String, socketId: String }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

ChatSessionSchema.index({ startedAt: 1 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
