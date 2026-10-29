
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    skillOffered: {
      type: String,
      trim: true,
      default: ""
    },
    skillWanted: {
      type: String,
      trim: true,
      default: ""
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

requestSchema.index({ sender: 1, receiver: 1, status: 1 });

module.exports = mongoose.model("Request", requestSchema);
