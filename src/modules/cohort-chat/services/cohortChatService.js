import { CohortMessage } from "../models/CohortMessage.js";
import {
  getPaginationParams,
  createPaginationResult,
} from "../../../utils/pagination.js";

const CONTENT_MAX_LENGTH = 2000;

export function validateMessageContent(content) {
  const trimmed = (content || "").trim();
  if (!trimmed) {
    return { valid: false, error: "Message content is required" };
  }
  if (trimmed.length > CONTENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `Message cannot exceed ${CONTENT_MAX_LENGTH} characters`,
    };
  }
  return { valid: true, content: trimmed };
}

export async function createCohortMessage({ cohortId, authorId, content }) {
  const validation = validateMessageContent(content);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const message = await CohortMessage.create({
    cohortId,
    authorId,
    content: validation.content,
    messageType: "TEXT",
  });

  await message.populate("authorId", "name email role avatarUrl");
  return message;
}

export async function listCohortMessages(cohortId, query = {}) {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { cohortId, deletedAt: null };

  if (query.before) {
    filter.createdAt = { $lt: new Date(query.before) };
  }

  const total = await CohortMessage.countDocuments(filter);
  const messages = await CohortMessage.find(filter)
    .populate("authorId", "name email role avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const result = createPaginationResult(
    messages.map((m) => m.toChatPayload()).reverse(),
    total,
    page,
    limit
  );
  return result;
}

export async function softDeleteCohortMessage(messageId, cohortId) {
  const message = await CohortMessage.findOne({
    _id: messageId,
    cohortId,
    deletedAt: null,
  });

  if (!message) {
    const err = new Error("Message not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  await message.softDelete();
  await message.populate("authorId", "name email role avatarUrl");
  return message;
}
