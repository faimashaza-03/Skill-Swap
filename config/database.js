const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("MongoDB connection failed: MONGODB_URI is missing from your .env file.");
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
      "The website can still open, but database-backed APIs need the database."
    );
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("error", error => {
  console.error("MongoDB error:", error.message);
});

module.exports = { connectDatabase, mongoose };