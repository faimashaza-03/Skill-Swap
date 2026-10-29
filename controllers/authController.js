const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function signup(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (cleanName.length > 100) {
      return res.status(400).json({ message: "Name must be 100 characters or fewer." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      passwordHash
    });

    return res.status(201).json({
      message: "Account created successfully!",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    return res.status(500).json({ message: "Could not create your account. Please try again." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: "Please enter your email and password." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.status(200).json({
      message: "Login successful!",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Could not log in. Please try again." });
  }
}

module.exports = { signup, login };