require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const User = require("./models/User");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

connectDB();

const io = new Server(server, {
  cors: {
    origin: [ "https://chat-frontend-xi-navy.vercel.app/"],
    methods: ["GET", "POST"],
  },
});

const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (username) => {
    onlineUsers[username] = socket.id;
    socket.join(username);
    console.log(`${username} is online`);
    io.emit("updateOnlineUsers", Object.keys(onlineUsers));
  });

  socket.on("sendMessage", async ({ sender, receiver, text }) => {
    if (!sender || !receiver || !text) {
      console.error("Missing sender, receiver, or text");
      return;
    }
  
    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();  // Save the message to the DB
  
    // Emit to receiver ONLY, not to sender (avoid duplicates)
    if (onlineUsers[receiver]) {
      io.to(onlineUsers[receiver]).emit("receiveMessage", newMessage);
    }
  });
  

  socket.on("disconnect", () => {
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
        break;
      }
    }
    io.emit("updateOnlineUsers", Object.keys(onlineUsers));
    console.log("Client disconnected");
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
