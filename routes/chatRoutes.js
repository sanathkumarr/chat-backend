const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");

const router = express.Router();

// 🔹 Search for a User
router.get("/search/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("username");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Get Messages Between Two Users
router.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.user1, receiver: req.params.user2 },
        { sender: req.params.user2, receiver: req.params.user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/private-message", async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;
    if (!sender || !receiver || !text) return res.status(400).json({ message: "All fields are required" });

    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();

    // ✅ Emit the message to only the receiver (avoid duplicate emit)
    req.io.to(receiver).emit("receiveMessage", newMessage);

    res.json({ message: "Message sent", newMessage });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/contacts/:username", async (req, res) => {
  console.log("Received request for contacts:", req.params.username);  // Debug log

  try {
    const username = req.params.username;
    console.log("Fetching contacts for:", username);

    const sentMessages = await Message.distinct("receiver", { sender: username });
    const receivedMessages = await Message.distinct("sender", { receiver: username });

    console.log("Sent to:", sentMessages);
    console.log("Received from:", receivedMessages);

    const contactUsernames = [...new Set([...sentMessages, ...receivedMessages])];
    const contacts = await User.find({ username: { $in: contactUsernames } }).select("username");

    console.log("Contacts found:", contacts);
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
