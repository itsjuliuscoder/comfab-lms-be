import { canAccessProgramChat } from "../modules/program-chat/services/programChatAccess.js";
import {
  createProgramMessage,
  validateMessageContent,
} from "../modules/program-chat/services/programChatService.js";
import { notifyProgramMentions } from "../modules/notifications/services/programMentionNotificationService.js";
import { logger } from "../utils/logger.js";

const programRoom = (programId) => `program:${programId}`;
const SEND_RATE_LIMIT_MS = 500;

export function registerProgramChatHandlers(io, socket) {
  const lastSendAt = new Map();

  const emitError = (code, message) => {
    socket.emit("program:error", { code, message });
  };

  socket.on("program:join", async ({ programId }) => {
    try {
      if (!programId) {
        return emitError("INVALID_PROGRAM", "Program ID is required");
      }

      const access = await canAccessProgramChat(socket.user, programId);
      if (!access.allowed) {
        return emitError("ACCESS_DENIED", access.reason);
      }

      const room = programRoom(programId);
      await socket.join(room);
      socket.data.activeProgramId = programId;
      socket.emit("program:joined", { programId });
    } catch (error) {
      logger.error("program:join error:", error);
      emitError("JOIN_FAILED", "Failed to join program chat");
    }
  });

  socket.on("program:leave", ({ programId }) => {
    const id = programId || socket.data.activeProgramId;
    if (!id) return;
    socket.leave(programRoom(id));
    if (socket.data.activeProgramId === id) {
      socket.data.activeProgramId = null;
    }
  });

  socket.on("program:message:send", async ({ programId, content }) => {
    try {
      const id = programId || socket.data.activeProgramId;
      if (!id) {
        return emitError("INVALID_PROGRAM", "Program ID is required");
      }

      const access = await canAccessProgramChat(socket.user, id);
      if (!access.allowed) {
        return emitError("ACCESS_DENIED", access.reason);
      }

      const validation = validateMessageContent(content);
      if (!validation.valid) {
        return emitError("VALIDATION_ERROR", validation.error);
      }

      const now = Date.now();
      const last = lastSendAt.get(socket.id) || 0;
      if (now - last < SEND_RATE_LIMIT_MS) {
        return emitError(
          "RATE_LIMIT",
          "Please wait before sending another message"
        );
      }
      lastSendAt.set(socket.id, now);

      const message = await createProgramMessage({
        programId: id,
        authorId: socket.user._id,
        content: validation.content,
      });

      const payload = message.toChatPayload();
      io.to(programRoom(id)).emit("program:message:new", payload);

      await notifyProgramMentions({
        programId: id,
        content: validation.content,
        sender: socket.user,
        messageId: message._id,
      });
    } catch (error) {
      logger.error("program:message:send error:", error);
      emitError("SEND_FAILED", error.message || "Failed to send message");
    }
  });

  socket.on("program:typing", async ({ programId, isTyping }) => {
    try {
      const id = programId || socket.data.activeProgramId;
      if (!id) return;

      const access = await canAccessProgramChat(socket.user, id);
      if (!access.allowed) return;

      socket.to(programRoom(id)).emit("program:typing", {
        programId: id,
        user: {
          id: socket.user._id.toString(),
          name: socket.user.name,
        },
        isTyping: Boolean(isTyping),
      });
    } catch (error) {
      logger.error("program:typing error:", error);
    }
  });

  socket.on("disconnect", () => {
    lastSendAt.delete(socket.id);
  });
}
