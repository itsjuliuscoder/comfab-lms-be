import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canAccessCohortChat,
  canDeleteCohortMessage,
} from "../services/cohortChatAccess.js";
import { validateMessageContent } from "../services/cohortChatService.js";

vi.mock("../../cohorts/models/Cohort.js", () => ({
  Cohort: {
    findById: vi.fn(),
  },
}));

vi.mock("../../cohorts/models/UserCohort.js", () => ({
  UserCohort: {
    isUserInCohort: vi.fn(),
  },
}));

import { Cohort } from "../../cohorts/models/Cohort.js";
import { UserCohort } from "../../cohorts/models/UserCohort.js";

describe("cohort chat access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admins for any cohort", async () => {
    Cohort.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "cohort-1", programId: "program-1" }),
    });

    const result = await canAccessCohortChat(
      { _id: "admin-1", role: "ADMIN" },
      "cohort-1"
    );

    expect(result.allowed).toBe(true);
    expect(UserCohort.isUserInCohort).not.toHaveBeenCalled();
  });

  it("allows instructors without membership", async () => {
    Cohort.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "cohort-1", programId: "program-1" }),
    });

    const result = await canAccessCohortChat(
      { _id: "instructor-1", role: "INSTRUCTOR" },
      "cohort-1"
    );

    expect(result.allowed).toBe(true);
    expect(UserCohort.isUserInCohort).not.toHaveBeenCalled();
  });

  it("requires active membership for participants", async () => {
    Cohort.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "cohort-1", programId: "program-1" }),
    });
    UserCohort.isUserInCohort.mockResolvedValue(null);

    const denied = await canAccessCohortChat(
      { _id: "participant-1", role: "PARTICIPANT" },
      "cohort-1"
    );
    expect(denied.allowed).toBe(false);

    UserCohort.isUserInCohort.mockResolvedValue({ _id: "membership-1" });
    const allowed = await canAccessCohortChat(
      { _id: "participant-1", role: "PARTICIPANT" },
      "cohort-1"
    );
    expect(allowed.allowed).toBe(true);
  });

  it("denies when cohort does not exist", async () => {
    Cohort.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const result = await canAccessCohortChat(
      { _id: "admin-1", role: "ADMIN" },
      "missing"
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Cohort not found");
  });
});

describe("canDeleteCohortMessage", () => {
  it("allows admins and instructors", () => {
    expect(
      canDeleteCohortMessage({ _id: "a1", role: "ADMIN" }, { authorId: "u2" })
    ).toBe(true);
    expect(
      canDeleteCohortMessage({ _id: "i1", role: "INSTRUCTOR" }, { authorId: "u2" })
    ).toBe(true);
  });

  it("allows authors to delete their own messages", () => {
    expect(
      canDeleteCohortMessage(
        { _id: "u1", role: "PARTICIPANT" },
        { authorId: { toString: () => "u1" } }
      )
    ).toBe(true);
    expect(
      canDeleteCohortMessage(
        { _id: "u1", role: "PARTICIPANT" },
        { authorId: { toString: () => "u2" } }
      )
    ).toBe(false);
  });
});

describe("validateMessageContent", () => {
  it("rejects empty content", () => {
    expect(validateMessageContent("   ").valid).toBe(false);
  });

  it("accepts trimmed content", () => {
    const result = validateMessageContent("  hello cohort  ");
    expect(result.valid).toBe(true);
    expect(result.content).toBe("hello cohort");
  });

  it("rejects content over 2000 characters", () => {
    const result = validateMessageContent("a".repeat(2001));
    expect(result.valid).toBe(false);
  });
});
