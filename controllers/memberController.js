const mongoose = require("mongoose");
const User = require("../models/User");

async function listMembers(req, res) {
  try {
    const currentUserId = String(req.query.exclude || "");
    const search = String(req.query.search || "").trim().slice(0, 80);

    if (!mongoose.isValidObjectId(currentUserId)) {
      return res.status(400).json({ message: "A valid user ID is required." });
    }

    const filter = { _id: { $ne: currentUserId } };
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

    return res.json({ users });
  } catch (error) {
    console.error("Find members error:", error.message);
    return res.status(500).json({ message: "Could not find members." });
  }
}

module.exports = { listMembers };