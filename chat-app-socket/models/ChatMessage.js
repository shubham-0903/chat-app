const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  fromUserId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  meta: { type: Object, default: {} },
  ts: { type: Date, default: Date.now }
}, { timestamps: true });

ChatMessageSchema.index({ roomId: 1, ts: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
