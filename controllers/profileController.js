const mongoose = require("mongoose");
const User = require("../models/User");

function profileResponse(user) {
  return {
    name: user.name,
    email: user.email,
    bio: user.bio,
    teach: user.skillsToTeach,
    learn: user.skillsToLearn
  };
}

async function getProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(userId).select(
      "name email bio skillsToTeach skillsToLearn"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ profile: profileResponse(user) });
  } catch (error) {
    console.error("Load profile error:", error.message);
    return res.status(500).json({ message: "Could not load profile." });
  }
}

async function updateProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const { bio, teach, learn } = req.body || {};
    if (
      typeof bio !== "string" ||
      !Array.isArray(teach) ||
      !Array.isArray(learn) ||
      !teach.every(skill => typeof skill === "string") ||
      !learn.every(skill => typeof skill === "string")
    ) {
      return res.status(400).json({ message: "Please provide a valid bio and skill lists." });
    }

    if (
      bio.length > 1000 ||
      teach.length > 100 ||
      learn.length > 100 ||
      [...teach, ...learn].some(skill => skill.length > 100)
    ) {
      return res.status(400).json({ message: "Profile data is too large." });
    }

    const cleanSkills = skills => [
      ...new Set(skills.map(skill => skill.trim()).filter(Boolean))
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
      { new: true, runValidators: true }
    ).select("name email bio skillsToTeach skillsToLearn");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile saved successfully!",
      profile: profileResponse(user)
    });
  } catch (error) {
    console.error("Save profile error:", error.message);
    return res.status(500).json({ message: "Could not save profile." });
  }
}

module.exports = { getProfile, updateProfile };