const mongoose = require("mongoose");
const Connection = require("../models/Connection");
const Request = require("../models/Request");
const User = require("../models/User");

async function createRequest(req, res) {
  try {
    const { senderId, receiverId, skillOffered, skillWanted, message } = req.body || {};
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

    return res.status(201).json({ message: "Request sent!", request });
  } catch (error) {
    console.error("Send request error:", error.message);
    return res.status(500).json({ message: "Could not send request." });
  }
}

async function listRequests(req, res) {
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

    return res.json({ requests });
  } catch (error) {
    console.error("List requests error:", error.message);
    return res.status(500).json({ message: "Could not load requests." });
  }
}

async function updateRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { userId, status } = req.body || {};

    if (!mongoose.isValidObjectId(requestId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid request or user ID." });
    }
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or rejected." });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }
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
      connection = await Connection.findOneAndUpdate(
        { request: request._id },
        {
          $setOnInsert: {
            users: [request.sender, request.receiver],
            request: request._id,
            status: "connected"
          }
        },
        { new: true, upsert: true }
      );
    }

    return res.json({ message: `Request ${status}.`, request, connection });
  } catch (error) {
    console.error("Respond to request error:", error.message);
    return res.status(500).json({ message: "Could not respond to request." });
  }
}

module.exports = { createRequest, listRequests, updateRequestStatus };