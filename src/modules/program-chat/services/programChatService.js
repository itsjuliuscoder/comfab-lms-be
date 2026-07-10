import { ProgramMessage } from "../models/ProgramMessage.js";
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

export async function createProgramMessage({ programId, authorId, content }) {
  const validation = validateMessageContent(content);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const message = await ProgramMessage.create({
    programId,
    authorId,
    content: validation.content,
    messageType: "TEXT",
  });

  await message.populate("authorId", "name email role avatarUrl");
  return message;
}

export async function listProgramMessages(programId, query = {}) {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = { programId, deletedAt: null };

  if (query.before) {
    filter.createdAt = { $lt: new Date(query.before) };
  }

  const total = await ProgramMessage.countDocuments(filter);
  const messages = await ProgramMessage.find(filter)
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

export async function softDeleteProgramMessage(messageId, programId) {
  const message = await ProgramMessage.findOne({
    _id: messageId,
    programId,
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
