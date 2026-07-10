import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindById = vi.fn();
const mockFindByUserAndProgram = vi.fn();
const mockEnrollmentSave = vi.fn();

vi.mock("../models/Program.js", () => ({
  Program: {
    findById: (...args) => mockFindById(...args),
  },
}));

vi.mock("../models/UserProgram.js", () => {
  const MockUserProgram = vi.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockEnrollmentSave;
  });
  MockUserProgram.findByUserAndProgram = (...args) =>
    mockFindByUserAndProgram(...args);
  return { default: MockUserProgram };
});

import UserProgram from "../models/UserProgram.js";
import { enrollUserInProgram } from "./programEnrollmentService.js";

describe("enrollUserInProgram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollmentSave.mockResolvedValue(undefined);
  });

  it("creates ACTIVE enrollment when none exists", async () => {
    const saveProgram = vi.fn().mockResolvedValue(undefined);
    const program = {
      addParticipant: vi.fn().mockReturnValue(true),
      save: saveProgram,
    };

    mockFindById.mockResolvedValue(program);
    mockFindByUserAndProgram.mockResolvedValue(null);

    const result = await enrollUserInProgram("user-1", "program-1", {
      status: "ACTIVE",
      skipCapacityCheck: true,
    });

    expect(mockFindById).toHaveBeenCalledWith("program-1");
    expect(UserProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        programId: "program-1",
        status: "ACTIVE",
      })
    );
    expect(mockEnrollmentSave).toHaveBeenCalled();
    expect(program.addParticipant).toHaveBeenCalled();
    expect(result.isNew).toBe(true);
  });

  it("returns existing enrollment without creating duplicate", async () => {
    const program = { addParticipant: vi.fn(), save: vi.fn() };
    mockFindById.mockResolvedValue(program);

    const existing = {
      status: "ACTIVE",
      save: vi.fn(),
    };
    mockFindByUserAndProgram.mockResolvedValue(existing);

    const result = await enrollUserInProgram("user-1", "program-1");

    expect(result.isNew).toBe(false);
    expect(result.enrollment).toBe(existing);
    expect(program.addParticipant).not.toHaveBeenCalled();
    expect(UserProgram).not.toHaveBeenCalled();
  });

  it("throws when program is not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(enrollUserInProgram("user-1", "missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
