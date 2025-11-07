const ViolationRule = require("../../models/violationRule");

async function detectViolations(message) {
  // Fetch all rules from DB
  const rules = await ViolationRule.find();

  // Check message against each rule
  const matchedRules = rules.filter((rule) => {
    try {
      // Build regex dynamically with \b word boundaries and case-insensitive flag
      const regex = new RegExp(`\\b(${rule.words.join("|")})\\b`, "i");

      return regex.test(message);
    } catch (err) {
      console.error(`Invalid regex in rule ${rule.type}:`, err);
      return false;
    }
  });

  // Return array of matched rules
  return matchedRules.map((rule) => ({
    type: rule.type,
    message: rule.message,
  }));
}

module.exports = { detectViolations };
