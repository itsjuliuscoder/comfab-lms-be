import { Server } from "socket.io";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { authenticateSocket } from "./auth.js";
import { registerCohortChatHandlers } from "./cohortChatHandlers.js";
import { userRoom } from "../modules/notifications/services/notificationService.js";

let ioInstance = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket.handshake);
      socket.user = user;
      next();
    } catch (error) {
      logger.warn("Socket auth failed:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.user._id} (${socket.user.role})`);
    socket.join(userRoom(socket.user._id));
    registerCohortChatHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.user._id} (${reason})`);
    });
  });

  ioInstance = io;
  logger.info("Socket.io initialized");
  return io;
}

export function getIO() {
  return ioInstance;
}
