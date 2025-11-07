const express = require("express");
const router = express.Router();
const violationController = require("../controllers/violationRulesControlles");
const {adminAuthMiddleware} = require("../middleware/authMiddleware");

router.post("/", adminAuthMiddleware,  violationController.createRule);
router.get("/", adminAuthMiddleware, violationController.getAllRules);
router.get("/:id", adminAuthMiddleware, violationController.getRuleById);
router.put("/:id", adminAuthMiddleware, violationController.updateRule);
router.delete("/:id", adminAuthMiddleware, violationController.deleteRule);

module.exports = router;
