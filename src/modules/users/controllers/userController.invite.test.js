import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findByEmail = vi.fn();
  const UserCohort = vi.fn();
  UserCohort.findOne = vi.fn();

  return {
    User,
    Cohort: {
      findById: vi.fn(),
    },
    Program: {
      findById: vi.fn(),
    },
    UserCohort,
    enrollUserInProgram: vi.fn(),
    ExcelService: {
      validateFile: vi.fn(),
      processExcelFile: vi.fn(),
    },
    sendInvitationEmail: vi.fn(),
  };
});

vi.mock("../models/User.js", () => ({
  User: mocked.User,
}));

vi.mock("../../../config/email.js", () => ({
  sendInvitationEmail: mocked.sendInvitationEmail,
}));

vi.mock("../../cohorts/models/Cohort.js", () => ({
  Cohort: mocked.Cohort,
}));

vi.mock("../../cohorts/models/UserCohort.js", () => ({
  UserCohort: mocked.UserCohort,
}));

vi.mock("../../programs/models/Program.js", () => ({
  default: mocked.Program,
  Program: mocked.Program,
}));

vi.mock("../../programs/services/programEnrollmentService.js", () => ({
  enrollUserInProgram: mocked.enrollUserInProgram,
}));

vi.mock("../services/excelService.js", () => ({
  default: mocked.ExcelService,
}));

const { inviteUser, bulkInviteUsers, bulkInviteUsersFromExcel } = await import(
  "./userController.js"
);

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("userController.inviteUser", () => {
  beforeEach(() => {
    mocked.User.mockReset();
    mocked.User.findByEmail.mockReset();
    mocked.Cohort.findById.mockReset();
    mocked.Program.findById.mockReset();
    mocked.UserCohort.mockReset();
    mocked.UserCohort.findOne.mockReset();
    mocked.enrollUserInProgram.mockReset();
    mocked.ExcelService.validateFile.mockReset();
    mocked.ExcelService.processExcelFile.mockReset();
    mocked.sendInvitationEmail.mockReset();
    mocked.Cohort.findById.mockResolvedValue(null);
    mocked.Program.findById.mockResolvedValue(null);
    mocked.UserCohort.findOne.mockResolvedValue(null);
    mocked.UserCohort.mockImplementation(function UserCohort(data) {
      Object.assign(this, data);
      this._id = "user-cohort-1";
      this.save = vi.fn().mockResolvedValue(this);
    });
    mocked.ExcelService.validateFile.mockReturnValue(undefined);
  });

  it("returns 400 for an invalid cohort ID", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);

    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        role: "PARTICIPANT",
        programId: "507f1f77bcf86cd799439012",
        cohortId: "admin-team",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "INVALID_COHORT_ID",
        }),
      })
    );
  });

  it("returns 400 when participant invite omits program", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);

    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        role: "PARTICIPANT",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "PROGRAM_REQUIRED",
        }),
      })
    );
  });

  it("returns 400 when participant invite omits cohort", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);

    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        role: "PARTICIPANT",
        programId: "507f1f77bcf86cd799439012",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "COHORT_REQUIRED",
        }),
      })
    );
  });

  it("creates an invited admin user with a plus-alias email and no password", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);
    mocked.User.mockImplementation(function User(data) {
      Object.assign(this, data);
      this._id = "invited-user-1";
      this.save = vi.fn().mockResolvedValue(this);
      this.toPublicJSON = vi.fn(() => ({
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        status: this.status,
      }));
    });

    const req = {
      body: {
        name: "Codex Admin Test User",
        email: "codex.admin.test+123@example.com",
        role: "ADMIN",
      },
      user: {
        _id: "admin-user-1",
        name: "Codex Admin",
        email: "codex.admin@example.com",
      },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.User).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Codex Admin Test User",
        email: "codex.admin.test+123@example.com",
        role: "ADMIN",
        status: "ACTIVE",
        invitedBy: "admin-user-1",
      })
    );
    expect(mocked.User.mock.instances[0].password).toBeUndefined();
    expect(mocked.sendInvitationEmail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: "codex.admin.test+123@example.com",
          }),
        }),
      })
    );
  });

  it("assigns an existing participant to another program and cohort", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";
    const existingUser = {
      _id: "participant-1",
      name: "Existing Participant",
      email: "existing@example.com",
      role: "PARTICIPANT",
      toPublicJSON: vi.fn(() => ({
        id: "participant-1",
        name: "Existing Participant",
        email: "existing@example.com",
        role: "PARTICIPANT",
      })),
    };
    mocked.User.findByEmail.mockResolvedValue(existingUser);
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => cohortId },
      name: "Cohort A",
      programId: { toString: () => programId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Program A",
    });
    mocked.enrollUserInProgram.mockResolvedValue({
      isNew: true,
      enrollment: { _id: "user-program-1" },
      program: { _id: programId },
    });

    const req = {
      body: {
        name: "Existing Participant",
        email: "existing@example.com",
        role: "PARTICIPANT",
        programId,
        cohortId,
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.enrollUserInProgram).toHaveBeenCalledWith(
      "participant-1",
      programId,
      expect.objectContaining({
        status: "ACTIVE",
        skipCapacityCheck: true,
      })
    );
    expect(mocked.UserCohort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "participant-1",
        cohortId,
        roleInCohort: "MEMBER",
      })
    );
    expect(mocked.User).not.toHaveBeenCalled();
    expect(mocked.sendInvitationEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          assigned: true,
          alreadyAssigned: false,
        }),
      })
    );
  });

  it("does not duplicate an existing participant program and cohort assignment", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";
    const existingUser = {
      _id: "participant-1",
      name: "Existing Participant",
      email: "existing@example.com",
      role: "PARTICIPANT",
      toPublicJSON: vi.fn(() => ({ id: "participant-1" })),
    };
    const existingMembership = {
      status: "ACTIVE",
      roleInCohort: "MEMBER",
      save: vi.fn(),
    };
    mocked.User.findByEmail.mockResolvedValue(existingUser);
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => cohortId },
      name: "Cohort A",
      programId: { toString: () => programId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Program A",
    });
    mocked.enrollUserInProgram.mockResolvedValue({
      isNew: false,
      enrollment: { _id: "user-program-1" },
      program: { _id: programId },
    });
    mocked.UserCohort.findOne.mockResolvedValue(existingMembership);

    const req = {
      body: {
        name: "Existing Participant",
        email: "existing@example.com",
        role: "PARTICIPANT",
        programId,
        cohortId,
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.UserCohort).not.toHaveBeenCalled();
    expect(existingMembership.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigned: true,
          alreadyAssigned: true,
        }),
      })
    );
  });

  it("rejects assigning an existing non-participant through participant invite", async () => {
    mocked.User.findByEmail.mockResolvedValue({
      _id: "admin-2",
      name: "Existing Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });

    const req = {
      body: {
        name: "Existing Admin",
        email: "admin@example.com",
        role: "PARTICIPANT",
        programId: "507f1f77bcf86cd799439012",
        cohortId: "507f1f77bcf86cd799439013",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.enrollUserInProgram).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "EXISTING_USER_ROLE_CONFLICT",
        }),
      })
    );
  });

  it("counts existing participants assigned by bulk invite as successful", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";
    const existingUser = {
      _id: "participant-1",
      name: "Existing Participant",
      email: "existing@example.com",
      role: "PARTICIPANT",
    };
    mocked.User.findByEmail.mockResolvedValue(existingUser);
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => cohortId },
      name: "Cohort A",
      programId: { toString: () => programId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Program A",
    });
    mocked.enrollUserInProgram.mockResolvedValue({
      isNew: true,
      enrollment: { _id: "user-program-1" },
      program: { _id: programId },
    });

    const req = {
      body: {
        users: [
          {
            name: "Existing Participant",
            email: "existing@example.com",
            role: "PARTICIPANT",
          },
        ],
        programId,
        cohortId,
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await bulkInviteUsers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          results: expect.objectContaining({
            successful: [
              expect.objectContaining({
                email: "existing@example.com",
                assignedExistingUser: true,
              }),
            ],
            skipped: [],
          }),
          summary: expect.objectContaining({
            successful: 1,
            skipped: 0,
          }),
        }),
      })
    );
  });

  it("counts existing participants assigned by Excel invite as successful", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";
    const existingUser = {
      _id: "participant-1",
      name: "Existing Participant",
      email: "existing@example.com",
      role: "PARTICIPANT",
    };
    mocked.ExcelService.processExcelFile.mockReturnValue({
      users: [
        {
          name: "Existing Participant",
          email: "existing@example.com",
          role: "PARTICIPANT",
        },
      ],
      errors: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
    });
    mocked.User.findByEmail.mockResolvedValue(existingUser);
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => cohortId },
      name: "Cohort A",
      programId: { toString: () => programId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Program A",
    });
    mocked.enrollUserInProgram.mockResolvedValue({
      isNew: true,
      enrollment: { _id: "user-program-1" },
      program: { _id: programId },
    });

    const req = {
      file: {
        buffer: Buffer.from("fake"),
        originalname: "bulk.xlsx",
      },
      body: {
        programId,
        cohortId,
        sendInvitationEmail: "false",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await bulkInviteUsersFromExcel(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          results: expect.objectContaining({
            successful: [
              expect.objectContaining({
                email: "existing@example.com",
                assignedExistingUser: true,
              }),
            ],
            skipped: [],
          }),
          summary: expect.objectContaining({
            successful: 1,
            skipped: 0,
          }),
        }),
      })
    );
  });
});
