const ViolationRule = require("../models/ViolationRule");

// Create a new rule
exports.createRule = async (req, res) => {
  try {
    const { type, words, message, isActive } = req.body;
    const rule = new ViolationRule({
      type,
      words,
      message,
      isActive: isActive !== undefined ? isActive : true,
    });
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//  Get all rules
exports.getAllRules = async (req, res) => {
  try {
    const rules = await ViolationRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Get a single rule by ID
exports.getRuleById = async (req, res) => {
  try {
    const rule = await ViolationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    res.json(rule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a rule
exports.updateRule = async (req, res) => {
  try {
    const { type, words, message, isActive } = req.body;
    const updated = await ViolationRule.findByIdAndUpdate(
      req.params.id,
      { type, words, message, isActive },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Rule not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a rule
exports.deleteRule = async (req, res) => {
  try {
    const deleted = await ViolationRule.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Rule not found" });
    res.json({ message: "Rule deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
