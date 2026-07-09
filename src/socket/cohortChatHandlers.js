import { canAccessCohortChat } from "../modules/cohort-chat/services/cohortChatAccess.js";
import {
  createCohortMessage,
  validateMessageContent,
} from "../modules/cohort-chat/services/cohortChatService.js";
import { notifyCohortMentions } from "../modules/notifications/services/cohortMentionNotificationService.js";
import { logger } from "../utils/logger.js";

const cohortRoom = (cohortId) => `cohort:${cohortId}`;
const SEND_RATE_LIMIT_MS = 500;

export function registerCohortChatHandlers(io, socket) {
  const lastSendAt = new Map();

  const emitError = (code, message) => {
    socket.emit("cohort:error", { code, message });
  };

  socket.on("cohort:join", async ({ cohortId }) => {
    try {
      if (!cohortId) {
        return emitError("INVALID_COHORT", "Cohort ID is required");
      }

      const access = await canAccessCohortChat(socket.user, cohortId);
      if (!access.allowed) {
        return emitError("ACCESS_DENIED", access.reason);
      }

      const room = cohortRoom(cohortId);
      await socket.join(room);
      socket.data.activeCohortId = cohortId;
      socket.emit("cohort:joined", { cohortId });
    } catch (error) {
      logger.error("cohort:join error:", error);
      emitError("JOIN_FAILED", "Failed to join cohort chat");
    }
  });

  socket.on("cohort:leave", ({ cohortId }) => {
    const id = cohortId || socket.data.activeCohortId;
    if (!id) return;
    socket.leave(cohortRoom(id));
    if (socket.data.activeCohortId === id) {
      socket.data.activeCohortId = null;
    }
  });

  socket.on("cohort:message:send", async ({ cohortId, content }) => {
    try {
      const id = cohortId || socket.data.activeCohortId;
      if (!id) {
        return emitError("INVALID_COHORT", "Cohort ID is required");
      }

      const access = await canAccessCohortChat(socket.user, id);
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
        return emitError("RATE_LIMIT", "Please wait before sending another message");
      }
      lastSendAt.set(socket.id, now);

      const message = await createCohortMessage({
        cohortId: id,
        authorId: socket.user._id,
        content: validation.content,
      });

      const payload = message.toChatPayload();
      io.to(cohortRoom(id)).emit("cohort:message:new", payload);

      await notifyCohortMentions({
        cohortId: id,
        content: validation.content,
        sender: socket.user,
        messageId: message._id,
      });
    } catch (error) {
      logger.error("cohort:message:send error:", error);
      emitError("SEND_FAILED", error.message || "Failed to send message");
    }
  });

  socket.on("cohort:typing", async ({ cohortId, isTyping }) => {
    try {
      const id = cohortId || socket.data.activeCohortId;
      if (!id) return;

      const access = await canAccessCohortChat(socket.user, id);
      if (!access.allowed) return;

      socket.to(cohortRoom(id)).emit("cohort:typing", {
        cohortId: id,
        user: {
          id: socket.user._id.toString(),
          name: socket.user.name,
        },
        isTyping: Boolean(isTyping),
      });
    } catch (error) {
      logger.error("cohort:typing error:", error);
    }
  });

  socket.on("disconnect", () => {
    lastSendAt.delete(socket.id);
  });
}
