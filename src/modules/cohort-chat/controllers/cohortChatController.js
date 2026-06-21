import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../../../utils/response.js";
import { logger } from "../../../utils/logger.js";
import {
  canAccessCohortChat,
  canDeleteCohortMessage,
} from "../services/cohortChatAccess.js";
import {
  listCohortMessages,
  softDeleteCohortMessage,
} from "../services/cohortChatService.js";
import { getIO } from "../../../socket/index.js";

export const getCohortMessages = async (req, res) => {
  try {
    const cohortId = req.params.id;
    const access = await canAccessCohortChat(req.user, cohortId);

    if (!access.allowed) {
      return forbiddenResponse(res, access.reason);
    }

    const result = await listCohortMessages(cohortId, req.query);
    return successResponse(res, result, "Messages retrieved successfully");
  } catch (error) {
    logger.error("Get cohort messages error:", error);
    return errorResponse(res, error);
  }
};

export const deleteCohortMessage = async (req, res) => {
  try {
    const { id: cohortId, messageId } = req.params;
    const access = await canAccessCohortChat(req.user, cohortId);

    if (!access.allowed) {
      return forbiddenResponse(res, access.reason);
    }

    const { CohortMessage } = await import("../models/CohortMessage.js");
    const existing = await CohortMessage.findOne({
      _id: messageId,
      cohortId,
      deletedAt: null,
    });

    if (!existing) {
      return notFoundResponse(res, "Message");
    }

    if (!canDeleteCohortMessage(req.user, existing)) {
      return forbiddenResponse(res, "You cannot delete this message");
    }

    const message = await softDeleteCohortMessage(messageId, cohortId);
    const payload = message.toChatPayload();

    const io = getIO();
    if (io) {
      io.to(`cohort:${cohortId}`).emit("cohort:message:deleted", payload);
    }

    return successResponse(res, payload, "Message deleted successfully");
  } catch (error) {
    if (error.statusCode === 404 || error.code === "NOT_FOUND") {
      return notFoundResponse(res, "Message");
    }
    logger.error("Delete cohort message error:", error);
    return errorResponse(res, error);
  }
};
