const VIOLATION_PATTERNS = [
  {
    type: "offensive_language",
    regex: /\b(shit|bitch)\b/i,
    message: "Offensive language detected"
  },
  {
    type: "spam_links",
    regex: /(http:\/\/|https:\/\/|www\.)/i,
    message: "Spam or promotional links are not allowed"
  },
  {
    type: "harassment",
    regex: /\b(kill yourself|you suck|stupid idiot)\b/i,
    message: "Harassment or bullying detected"
  }
];

module.exports = { VIOLATION_PATTERNS };