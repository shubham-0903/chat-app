require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const logger = require("./src/config/logger");
const routes = require("./src/routes");
const morgan = require("morgan");
const passport = require("passport");
const setupPassport = require("./src/config/passport");



const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
app.use(passport.initialize());
setupPassport(passport);

// Routes
app.use("/api", routes);

// Start server
app.listen(PORT, async () => {
  await connectDB();
  logger.info(`API Server running on http://localhost:${PORT}`);
});
