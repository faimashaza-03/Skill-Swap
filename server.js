const dns = require("node:dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Request = require("./models/Request");
const Connection = require("./models/Connection");
const Message = require("./models/Message");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Check whether the database is connected
function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

// Database availability middleware
function requireDatabase(req, res, next) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      message:
        "Database is not connected. Please check your MongoDB Atlas connection."
    });
  }

  next();
}

// API test route
app.get("/api/test", (req, res) => {
  res.status(200).json({
    message: "SkillSwap Hub API is working!",
    database: isDatabaseConnected() ? "connected" : "disconnected"
  });
});

// Signup route
app.post("/api/signup", requireDatabase, async (req, res) => {
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
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be 100 characters or fewer."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters."
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
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
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    return res.status(500).json({
      message: "Could not create your account. Please try again."
    });
  }
});

// Login route
app.post("/api/login", requireDatabase, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
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

    return res.status(500).json({
      message: "Could not log in. Please try again."
    });
  }
});

// Load a user's profile
app.get(
  "/api/profile/:userId",
  requireDatabase,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Invalid user ID."
        });
      }

      const user = await User.findById(userId).select(
        "name email bio skillsToTeach skillsToLearn"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.status(200).json({
        profile: {
          name: user.name,
          email: user.email,
          bio: user.bio,
          teach: user.skillsToTeach,
          learn: user.skillsToLearn
        }
      });
    } catch (error) {
      console.error("Load profile error:", error.message);

      return res.status(500).json({
        message: "Could not load profile."
      });
    }
  }
);

// Save a user's profile
app.put(
  "/api/profile/:userId",
  requireDatabase,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Invalid user ID."
        });
      }

      const { bio, teach, learn } = req.body || {};

      if (
        typeof bio !== "string" ||
        !Array.isArray(teach) ||
        !Array.isArray(learn) ||
        !teach.every(skill => typeof skill === "string") ||
        !learn.every(skill => typeof skill === "string")
      ) {
        return res.status(400).json({
          message: "Please provide a valid bio and skill lists."
        });
      }

      if (
        bio.length > 1000 ||
        teach.length > 100 ||
        learn.length > 100 ||
        [...teach, ...learn].some(skill => skill.length > 100)
      ) {
        return res.status(400).json({
          message: "Profile data is too large."
        });
      }

      const cleanSkills = skills => [
        ...new Set(
          skills.map(skill => skill.trim()).filter(Boolean)
        )
      ];

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            bio: bio.trim(),
            skillsToTeach: cleanSkills(teach),
            skillsToLearn: cleanSkills(learn)
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).select("name email bio skillsToTeach skillsToLearn");

      if (!user) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.status(200).json({
        message: "Profile saved successfully!",
        profile: {
          name: user.name,
          email: user.email,
          bio: user.bio,
          teach: user.skillsToTeach,
          learn: user.skillsToLearn
        }
      });
    } catch (error) {
      console.error("Save profile error:", error.message);

      return res.status(500).json({
        message: "Could not save profile."
      });
    }
  }
);


/* ===== SKILLSWAP REQUESTS, CONNECTIONS & MESSAGES ===== */

// Send a skill request
app.post("/api/requests", requireDatabase, async (req, res) => {
  try {
    const { senderId, receiverId, skillOffered, skillWanted, message } = req.body;

    if (
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId) ||
      senderId === receiverId
    ) {
      return res.status(400).json({ message: "Invalid sender or receiver." });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    const existing = await Request.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending"
    });

    if (existing) {
      return res.status(409).json({ message: "A pending request already exists." });
    }

    const request = await Request.create({
      sender: senderId,
      receiver: receiverId,
      skillOffered: String(skillOffered || "").trim().slice(0, 100),
      skillWanted: String(skillWanted || "").trim().slice(0, 100),
      message: String(message || "").trim().slice(0, 500)
    });

    res.status(201).json({ message: "Request sent!", request });
  } catch (error) {
    console.error("Send request error:", error.message);
    res.status(500).json({ message: "Could not send request." });
  }
});

// List requests sent to or by a user
app.get("/api/requests/:userId", requireDatabase, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const requests = await Request.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate("sender", "name email skillsToTeach skillsToLearn")
      .populate("receiver", "name email skillsToTeach skillsToLearn")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error("List requests error:", error.message);
    res.status(500).json({ message: "Could not load requests." });
  }
});

// Accept or reject a request
app.patch("/api/requests/:requestId", requireDatabase, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, status } = req.body;

    if (!mongoose.isValidObjectId(requestId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid request or user ID." });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or rejected." });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Only the receiver can respond." });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: "This request has already been handled." });
    }

    request.status = status;
    await request.save();

    let connection = null;
    if (status === "accepted") {
      const ids = [request.sender, request.receiver];
      connection = await Connection.findOneAndUpdate(
        { request: request._id },
        { $setOnInsert: { users: ids, request: request._id, status: "connected" } },
        { new: true, upsert: true }
      );
    }

    res.json({ message: `Request ${status}.`, request, connection });
  } catch (error) {
    console.error("Respond to request error:", error.message);
    res.status(500).json({ message: "Could not respond to request." });
  }
});

// List a user's connections
app.get("/api/connections/:userId", requireDatabase, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const connections = await Connection.find({
      users: userId,
      status: "connected"
    })
      .populate("users", "name email skillsToTeach skillsToLearn")
      .sort({ createdAt: -1 });

    res.json({ connections });
  } catch (error) {
    console.error("Load connections error:", error.message);
    res.status(500).json({ message: "Could not load connections." });
  }
});

// Send a message to an existing connection
app.post("/api/connections/:connectionId/messages", requireDatabase, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { senderId, text } = req.body;

    if (!mongoose.isValidObjectId(connectionId) || !mongoose.isValidObjectId(senderId)) {
      return res.status(400).json({ message: "Invalid connection or sender ID." });
    }

    if (typeof text !== "string" || !text.trim() || text.trim().length > 2000) {
      return res.status(400).json({ message: "Message must be 1–2000 characters." });
    }

    const connection = await Connection.findOne({
      _id: connectionId,
      users: senderId,
      status: "connected"
    });

    if (!connection) {
      return res.status(403).json({ message: "You are not part of this connection." });
    }

    const receiverId = connection.users.find(id => id.toString() !== senderId).toString();

    const message = await Message.create({
      connection: connection._id,
      sender: senderId,
      receiver: receiverId,
      text: text.trim()
    });

    res.status(201).json({ message: "Message sent!", data: message });
  } catch (error) {
    console.error("Send message error:", error.message);
    res.status(500).json({ message: "Could not send message." });
  }
});

// List messages for a connection
app.get("/api/connections/:connectionId/messages", requireDatabase, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { userId } = req.query;

    if (!mongoose.isValidObjectId(connectionId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid connection or user ID." });
    }

    const connection = await Connection.findOne({
      _id: connectionId,
      users: userId,
      status: "connected"
    });

    if (!connection) {
      return res.status(403).json({ message: "You are not part of this connection." });
    }

    const messages = await Message.find({ connection: connectionId })
      .sort({ createdAt: 1 })
      .limit(500)
      .populate("sender", "name");

    res.json({ messages });
  } catch (error) {
    console.error("Load messages error:", error.message);
    res.status(500).json({ message: "Could not load messages." });
  }
});

/* Find members for skill exchanges */
app.get("/api/users", requireDatabase, async (req, res) => {
  try {
    const currentUserId = String(req.query.exclude || "");
    const search = String(req.query.search || "").trim().slice(0, 80);

    if (!mongoose.isValidObjectId(currentUserId)) {
      return res.status(400).json({
        message: "A valid user ID is required."
      });
    }

    const filter = {
      _id: { $ne: currentUserId }
    };

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { skillsToTeach: { $regex: safeSearch, $options: "i" } },
        { skillsToLearn: { $regex: safeSearch, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("name bio skillsToTeach skillsToLearn")
      .limit(50)
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Find members error:", error.message);
    res.status(500).json({
      message: "Could not find members."
    });
  }
});

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

// Start the web server
const server = app.listen(PORT, () => {
  console.log(`SkillSwap Hub is running at http://localhost:${PORT}`);
  console.log("Checking MongoDB Atlas connection...");
});

// Connect to MongoDB Atlas
async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error(
      "MongoDB connection failed: MONGODB_URI is missing from your .env file."
    );
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error(
      "Check your Atlas network access, database username/password, and MONGODB_URI."
    );
    console.error(
      "The website can still open, but signup, login, and profile APIs need the database."
    );
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("error", error => {
  console.error("MongoDB error:", error.message);
});

connectDatabase();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down SkillSwap Hub...");

  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
});

