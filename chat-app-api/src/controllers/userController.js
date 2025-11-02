const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { JWT_EXPIRES_IN } = require("../constant");

// Signup Handler
exports.signupHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const user = new User({ name, email, password });
    await user.save();


    res.status(201).json({
      message: "User created successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Handler
exports.loginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Profile Handler (for protected route)
exports.profileHandler = async (req, res) => {
  res.status(200).json({
    message: "Authorized access",
    user: req.user,
  });
};

// Logout Handler
exports.logoutHandler = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};
