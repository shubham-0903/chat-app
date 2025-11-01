const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API server is healthy",
    timestamp: new Date(),
  });
});

module.exports = router;