import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { verifyToken } from "./utils/token.utils.js";

/**
 * @typedef {import("socket.io").Socket & { userId: string }} AuthenticatedSocket
 */

const PORT = process.env.PORT || 5000;

// ─── Create HTTP server ───────────────────────────────────────────────────────
const httpServer = createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ─── Socket.io Authentication Middleware ─────────────────────────────────────
io.use((/** @type {AuthenticatedSocket} */ socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = /** @type {{ id: string }} */ (verifyToken(token));
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Authentication error: Invalid token"));
  }
});

// ─── Connection Handler ───────────────────────────────────────────────────────
io.on("connection", (/** @type {AuthenticatedSocket} */ socket) => {
  const userId = socket.userId;
  console.log(`⚡ Socket connected: user ${userId} (socket ${socket.id})`);

  // Join personal room for targeted notifications
  socket.join(`user:${userId}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: user ${userId} (socket ${socket.id})`);
  });
});

// ─── Attach io to app so controllers can access it ───────────────────────────
app.locals.io = io;

// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
});
