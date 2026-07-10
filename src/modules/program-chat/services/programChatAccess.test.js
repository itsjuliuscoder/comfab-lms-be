import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canAccessProgramChat,
  canDeleteProgramMessage,
} from "./programChatAccess.js";
import { validateMessageContent } from "./programChatService.js";

vi.mock("../../programs/models/Program.js", () => ({
  Program: {
    findById: vi.fn(),
  },
}));

vi.mock("../../programs/models/UserProgram.js", () => ({
  default: {
    findByUserAndProgram: vi.fn(),
  },
}));

import { Program } from "../../programs/models/Program.js";
import UserProgram from "../../programs/models/UserProgram.js";

describe("program chat access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admins for any program", async () => {
    Program.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "program-1",
        ownerId: "owner-1",
        coordinatorId: "coord-1",
        name: "Program A",
      }),
    });

    const result = await canAccessProgramChat(
      { _id: "admin-1", role: "ADMIN" },
      "program-1"
    );

    expect(result.allowed).toBe(true);
    expect(UserProgram.findByUserAndProgram).not.toHaveBeenCalled();
  });

  it("allows instructors who own or coordinate the program", async () => {
    Program.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "program-1",
        ownerId: "owner-1",
        coordinatorId: "coord-1",
        name: "Program A",
      }),
    });

    const ownerResult = await canAccessProgramChat(
      { _id: "owner-1", role: "INSTRUCTOR" },
      "program-1"
    );
    expect(ownerResult.allowed).toBe(true);

    const coordResult = await canAccessProgramChat(
      { _id: "coord-1", role: "INSTRUCTOR" },
      "program-1"
    );
    expect(coordResult.allowed).toBe(true);

    const otherResult = await canAccessProgramChat(
      { _id: "other-instructor", role: "INSTRUCTOR" },
      "program-1"
    );
    expect(otherResult.allowed).toBe(false);
  });

  it("requires active enrollment for participants", async () => {
    Program.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "program-1",
        ownerId: "owner-1",
        coordinatorId: "coord-1",
        name: "Program A",
      }),
    });

    UserProgram.findByUserAndProgram.mockResolvedValue(null);
    const denied = await canAccessProgramChat(
      { _id: "participant-1", role: "PARTICIPANT" },
      "program-1"
    );
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain("invitation");

    UserProgram.findByUserAndProgram.mockResolvedValue({ status: "PENDING" });
    const pending = await canAccessProgramChat(
      { _id: "participant-1", role: "PARTICIPANT" },
      "program-1"
    );
    expect(pending.allowed).toBe(false);
    expect(pending.reason).toContain("pending approval");

    UserProgram.findByUserAndProgram.mockResolvedValue({ status: "ACTIVE" });
    const allowed = await canAccessProgramChat(
      { _id: "participant-1", role: "PARTICIPANT" },
      "program-1"
    );
    expect(allowed.allowed).toBe(true);
  });

  it("denies when program does not exist", async () => {
    Program.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const result = await canAccessProgramChat(
      { _id: "admin-1", role: "ADMIN" },
      "missing"
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Program not found");
  });
});

describe("canDeleteProgramMessage", () => {
  const program = {
    ownerId: { toString: () => "owner-1" },
    coordinatorId: { toString: () => "coord-1" },
  };

  it("allows admins and managing instructors", () => {
    expect(
      canDeleteProgramMessage({ _id: "a1", role: "ADMIN" }, { authorId: "u2" })
    ).toBe(true);
    expect(
      canDeleteProgramMessage(
        { _id: "owner-1", role: "INSTRUCTOR" },
        { authorId: "u2" },
        program
      )
    ).toBe(true);
    expect(
      canDeleteProgramMessage(
        { _id: "other", role: "INSTRUCTOR" },
        { authorId: "u2" },
        program
      )
    ).toBe(false);
  });

  it("allows authors to delete their own messages", () => {
    expect(
      canDeleteProgramMessage(
        { _id: "u1", role: "PARTICIPANT" },
        { authorId: { toString: () => "u1" } },
        program
      )
    ).toBe(true);
    expect(
      canDeleteProgramMessage(
        { _id: "u1", role: "PARTICIPANT" },
        { authorId: { toString: () => "u2" } },
        program
      )
    ).toBe(false);
  });
});

describe("validateMessageContent", () => {
  it("rejects empty content", () => {
    expect(validateMessageContent("   ").valid).toBe(false);
  });

  it("accepts trimmed content", () => {
    const result = validateMessageContent("  hello program  ");
    expect(result.valid).toBe(true);
    expect(result.content).toBe("hello program");
  });
});
