
const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    users: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        }
      ],
      validate: {
        validator: users => users.length === 2,
        message: "A connection must have exactly two users."
      }
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ["connected"],
      default: "connected"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Connection", connectionSchema);
