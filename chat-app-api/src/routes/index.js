const express = require("express");
const router = express.Router();

const healthRoutes = require("./health");
const userRoutes = require("./userRoutes");


router.use("/user", userRoutes);
router.use("/health", healthRoutes);

module.exports = router;
