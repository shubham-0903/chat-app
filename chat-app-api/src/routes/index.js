const express = require("express");
const router = express.Router();

const healthRoutes = require("./health");
const userRoutes = require("./userRoutes");
const adminRoutes = require("./admin");
const violationRoutes = require("./violationRule");


router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/violation-rules", violationRoutes);
router.use("/health", healthRoutes);

module.exports = router;
