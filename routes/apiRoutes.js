const express = require("express");
const requireDatabase = require("../middleware/requireDatabase");
const { signup, login } = require("../controllers/authController");
const { getProfile, updateProfile } = require("../controllers/profileController");
const { listMembers } = require("../controllers/memberController");
const {
  createRequest,
  listRequests,
  updateRequestStatus
} = require("../controllers/requestController");
const {
  listConnections,
  listMessages,
  sendMessage
} = require("../controllers/connectionController");
const { getApiStatus } = require("../controllers/healthController");

const router = express.Router();

router.get("/test", getApiStatus);
router.post("/signup", requireDatabase, signup);
router.post("/login", requireDatabase, login);
router.get("/profile/:userId", requireDatabase, getProfile);
router.put("/profile/:userId", requireDatabase, updateProfile);
router.get("/users", requireDatabase, listMembers);
router.post("/requests", requireDatabase, createRequest);
router.get("/requests/:userId", requireDatabase, listRequests);
router.patch("/requests/:requestId", requireDatabase, updateRequestStatus);
router.get("/connections/:userId", requireDatabase, listConnections);
router.post(
  "/connections/:connectionId/messages",
  requireDatabase,
  sendMessage
);
router.get(
  "/connections/:connectionId/messages",
  requireDatabase,
  listMessages
);
router.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

module.exports = router;