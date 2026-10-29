const mongoose = require("mongoose");

function getApiStatus(req, res) {
  return res.status(200).json({
    message: "SkillSwap Hub API is working!",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
}

module.exports = { getApiStatus };