const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/user");
const InternalUser = require("../models/internalUser");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

module.exports = (passport) => {
  passport.use(
    "user-jwt",
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id).select("-password");
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  // Separate strategy for admin
  passport.use(
    "admin-jwt",
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await InternalUser.findById(jwt_payload.id).select("-password");
         if (!user) return done(null, false);

        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );
};
