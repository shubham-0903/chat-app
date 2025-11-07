const express = require("express");
const router = express.Router();
const passport = require("passport");

const {
  signupHandler,
  loginHandler,
  profileHandler,
  logoutHandler,
} = require("../controllers/userController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Routes
router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.get("/profile", authMiddleware, profileHandler);
router.post("/logout", logoutHandler);

module.exports = router;
