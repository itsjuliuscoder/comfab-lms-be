import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../../../utils/response.js";
import { logger } from "../../../utils/logger.js";
import {
  canAccessProgramChat,
  canDeleteProgramMessage,
} from "../services/programChatAccess.js";
import {
  createProgramMessage,
  listProgramMessages,
  softDeleteProgramMessage,
} from "../services/programChatService.js";
import { getIO } from "../../../socket/index.js";
import { notifyProgramMentions } from "../../notifications/services/programMentionNotificationService.js";

export const getProgramMessages = async (req, res) => {
  try {
    const programId = req.params.id;
    const access = await canAccessProgramChat(req.user, programId);

    if (!access.allowed) {
      return forbiddenResponse(res, access.reason);
    }

    const result = await listProgramMessages(programId, req.query);
    return successResponse(res, result, "Messages retrieved successfully");
  } catch (error) {
    logger.error("Get program messages error:", error);
    return errorResponse(res, error);
  }
};

export const createProgramChatMessage = async (req, res) => {
  try {
    const programId = req.params.id;
    const access = await canAccessProgramChat(req.user, programId);

    if (!access.allowed) {
      return forbiddenResponse(res, access.reason);
    }

    const message = await createProgramMessage({
      programId,
      authorId: req.user._id,
      content: req.body?.content,
    });
    const payload = message.toChatPayload();

    const io = getIO();
    if (io) {
      io.to(`program:${programId}`).emit("program:message:new", payload);
    }

    notifyProgramMentions({
      programId,
      content: payload.content,
      sender: req.user,
      messageId: message._id,
    }).catch((error) => {
      logger.error("Program message mention notification error:", error);
    });

    return successResponse(res, payload, "Message sent successfully", 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error, error.statusCode);
    }
    logger.error("Create program message error:", error);
    return errorResponse(res, error);
  }
};

export const deleteProgramMessage = async (req, res) => {
  try {
    const { id: programId, messageId } = req.params;
    const access = await canAccessProgramChat(req.user, programId);

    if (!access.allowed) {
      return forbiddenResponse(res, access.reason);
    }

    const { ProgramMessage } = await import("../models/ProgramMessage.js");
    const existing = await ProgramMessage.findOne({
      _id: messageId,
      programId,
      deletedAt: null,
    });

    if (!existing) {
      return notFoundResponse(res, "Message");
    }

    if (!canDeleteProgramMessage(req.user, existing, access.program)) {
      return forbiddenResponse(res, "You cannot delete this message");
    }

    const message = await softDeleteProgramMessage(messageId, programId);
    const payload = message.toChatPayload();

    const io = getIO();
    if (io) {
      io.to(`program:${programId}`).emit("program:message:deleted", payload);
    }

    return successResponse(res, payload, "Message deleted successfully");
  } catch (error) {
    if (error.statusCode === 404 || error.code === "NOT_FOUND") {
      return notFoundResponse(res, "Message");
    }
    logger.error("Delete program message error:", error);
    return errorResponse(res, error);
  }
};
