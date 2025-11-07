const express = require("express");
const router = express.Router();

const {
  loginHandler,
  profileHandler,
  logoutHandler,
} = require("../controllers/adminController");
const {adminAuthMiddleware} = require("../middleware/authMiddleware");

// Routes
router.post("/login", loginHandler);
router.get("/profile", adminAuthMiddleware, profileHandler);
router.post("/logout", logoutHandler);

module.exports = router;
