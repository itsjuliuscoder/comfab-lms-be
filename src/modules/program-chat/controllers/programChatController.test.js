import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/programChatAccess.js", () => ({
  canAccessProgramChat: vi.fn(),
  canDeleteProgramMessage: vi.fn(),
}));

vi.mock("../services/programChatService.js", () => ({
  createProgramMessage: vi.fn(),
  listProgramMessages: vi.fn(),
  softDeleteProgramMessage: vi.fn(),
}));

vi.mock("../../../socket/index.js", () => ({
  getIO: vi.fn(),
}));

vi.mock("../../notifications/services/programMentionNotificationService.js", () => ({
  notifyProgramMentions: vi.fn(),
}));

import { createProgramChatMessage } from "./programChatController.js";
import { canAccessProgramChat } from "../services/programChatAccess.js";
import { createProgramMessage } from "../services/programChatService.js";
import { getIO } from "../../../socket/index.js";
import { notifyProgramMentions } from "../../notifications/services/programMentionNotificationService.js";

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

function createRequest(overrides = {}) {
  return {
    params: { id: "program-1" },
    body: { content: "Hello program" },
    user: { _id: "user-1", role: "PARTICIPANT", name: "Participant" },
    ...overrides,
  };
}

describe("createProgramChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyProgramMentions.mockResolvedValue(undefined);
  });

  it("creates, broadcasts, and returns a program chat message", async () => {
    const payload = {
      id: "message-1",
      programId: "program-1",
      content: "Hello program",
      messageType: "TEXT",
      author: { id: "user-1", name: "Participant" },
      createdAt: new Date().toISOString(),
    };
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));

    canAccessProgramChat.mockResolvedValue({ allowed: true });
    createProgramMessage.mockResolvedValue({
      _id: "message-1",
      toChatPayload: () => payload,
    });
    getIO.mockReturnValue({ to });

    const res = createResponse();
    await createProgramChatMessage(createRequest(), res);

    expect(createProgramMessage).toHaveBeenCalledWith({
      programId: "program-1",
      authorId: "user-1",
      content: "Hello program",
    });
    expect(to).toHaveBeenCalledWith("program:program-1");
    expect(emit).toHaveBeenCalledWith("program:message:new", payload);
    expect(notifyProgramMentions).toHaveBeenCalledWith({
      programId: "program-1",
      content: "Hello program",
      sender: expect.objectContaining({ _id: "user-1" }),
      messageId: "message-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: payload,
      message: "Message sent successfully",
    });
  });

  it("returns forbidden when the user cannot access the program chat", async () => {
    canAccessProgramChat.mockResolvedValue({
      allowed: false,
      reason: "You need a program invitation to join this interactive section",
    });

    const res = createResponse();
    await createProgramChatMessage(createRequest(), res);

    expect(createProgramMessage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "You need a program invitation to join this interactive section",
      },
    });
  });

  it("returns validation errors from message creation", async () => {
    const error = new Error("Message content is required");
    error.code = "VALIDATION_ERROR";
    error.statusCode = 400;

    canAccessProgramChat.mockResolvedValue({ allowed: true });
    createProgramMessage.mockRejectedValue(error);

    const res = createResponse();
    await createProgramChatMessage(createRequest({ body: { content: "" } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Message content is required",
        details: null,
      },
    });
  });

  it("still returns success when Socket.IO is unavailable", async () => {
    const payload = {
      id: "message-1",
      programId: "program-1",
      content: "Hello program",
      messageType: "TEXT",
      author: { id: "user-1" },
      createdAt: new Date().toISOString(),
    };

    canAccessProgramChat.mockResolvedValue({ allowed: true });
    createProgramMessage.mockResolvedValue({
      _id: "message-1",
      toChatPayload: () => payload,
    });
    getIO.mockReturnValue(null);

    const res = createResponse();
    await createProgramChatMessage(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: payload,
      message: "Message sent successfully",
    });
  });
});
