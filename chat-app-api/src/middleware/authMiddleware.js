const passport = require("passport");

const authMiddleware = passport.authenticate("user-jwt", { session: false });
const adminAuthMiddleware = passport.authenticate("admin-jwt", { session: false });

module.exports = {authMiddleware, adminAuthMiddleware};
