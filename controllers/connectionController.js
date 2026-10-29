const mongoose = require("mongoose");
const Connection = require("../models/Connection");
const Message = require("../models/Message");

async function listConnections(req, res) {
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

    return res.json({ connections });
  } catch (error) {
    console.error("Load connections error:", error.message);
    return res.status(500).json({ message: "Could not load connections." });
  }
}

async function sendMessage(req, res) {
  try {
    const { connectionId } = req.params;
    const { senderId, text } = req.body || {};

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

    const receiverId = connection.users
      .find(id => id.toString() !== senderId)
      .toString();
    const message = await Message.create({
      connection: connection._id,
      sender: senderId,
      receiver: receiverId,
      text: text.trim()
    });

    return res.status(201).json({ message: "Message sent!", data: message });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(500).json({ message: "Could not send message." });
  }
}

async function listMessages(req, res) {
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

    return res.json({ messages });
  } catch (error) {
    console.error("Load messages error:", error.message);
    return res.status(500).json({ message: "Could not load messages." });
  }
}

module.exports = { listConnections, listMessages, sendMessage };