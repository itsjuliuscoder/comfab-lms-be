import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findByEmail = vi.fn();
  User.findById = vi.fn();
  User.findByIdAndUpdate = vi.fn();
  User.findByIdAndDelete = vi.fn();
  const UserCohort = vi.fn();
  UserCohort.findOne = vi.fn();

  return {
    User,
    Cohort: {
      findById: vi.fn(),
      findOne: vi.fn(),
    },
    Program: {
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
    },
    UserCohort,
    enrollUserInProgram: vi.fn(),
    createNotification: vi.fn(),
    ExcelService: {
      validateFile: vi.fn(),
      processExcelFile: vi.fn(),
      generateTemplate: vi.fn(),
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

vi.mock("../../notifications/services/notificationService.js", () => ({
  createNotification: mocked.createNotification,
}));

vi.mock("../services/excelService.js", () => ({
  default: mocked.ExcelService,
}));

const {
  inviteUser,
  bulkInviteUsers,
  bulkInviteUsersFromExcel,
  updateUser,
  deleteUser,
  downloadBulkInviteTemplate,
} = await import("./userController.js");

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn(() => res);
  res.send = vi.fn(() => res);
  return res;
};

describe("userController.inviteUser", () => {
  beforeEach(() => {
    mocked.User.mockReset();
    mocked.User.findByEmail.mockReset();
    mocked.User.findById.mockReset();
    mocked.User.findByIdAndUpdate.mockReset();
    mocked.User.findByIdAndDelete.mockReset();
    mocked.Cohort.findById.mockReset();
    mocked.Cohort.findOne.mockReset();
    mocked.Program.findById.mockReset();
    mocked.Program.findOne.mockReset();
    mocked.Program.find.mockReset();
    mocked.UserCohort.mockReset();
    mocked.UserCohort.findOne.mockReset();
    mocked.enrollUserInProgram.mockReset();
    mocked.createNotification.mockReset();
    mocked.ExcelService.validateFile.mockReset();
    mocked.ExcelService.processExcelFile.mockReset();
    mocked.ExcelService.generateTemplate.mockReset();
    mocked.sendInvitationEmail.mockReset();
    mocked.Cohort.findById.mockResolvedValue(null);
    mocked.Cohort.findOne.mockReset();
    mocked.Program.findById.mockResolvedValue(null);
    mocked.Program.findOne.mockReset();
    mocked.Program.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mocked.UserCohort.findOne.mockResolvedValue(null);
    mocked.UserCohort.mockImplementation(function UserCohort(data) {
      Object.assign(this, data);
      this._id = "user-cohort-1";
      this.save = vi.fn().mockResolvedValue(this);
    });
    mocked.ExcelService.validateFile.mockReturnValue(undefined);
    mocked.ExcelService.generateTemplate.mockReturnValue(Buffer.from("template"));
    mocked.createNotification.mockResolvedValue({});
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

  it("rejects admin inviting a Super Admin", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);

    const req = {
      body: {
        name: "Super Admin Candidate",
        email: "super@example.com",
        role: "SUPER_ADMIN",
      },
      user: {
        _id: "admin-user-1",
        role: "ADMIN",
      },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.User).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "SUPER_ADMIN_REQUIRED",
        }),
      })
    );
  });

  it("allows Super Admin inviting another Super Admin", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);
    mocked.User.mockImplementation(function User(data) {
      Object.assign(this, data);
      this._id = "super-user-2";
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
        name: "Super Admin Candidate",
        email: "super@example.com",
        role: "SUPER_ADMIN",
      },
      user: {
        _id: "super-user-1",
        role: "SUPER_ADMIN",
        name: "Root Admin",
        email: "root@example.com",
      },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.User).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "SUPER_ADMIN",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
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

  it("assigns an existing instructor to a program without changing their role", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const existingUser = {
      _id: "instructor-1",
      name: "Existing Instructor",
      email: "teacher@example.com",
      role: "INSTRUCTOR",
      toPublicJSON: vi.fn(() => ({
        id: "instructor-1",
        name: "Existing Instructor",
        email: "teacher@example.com",
        role: "INSTRUCTOR",
      })),
    };
    mocked.User.findByEmail.mockResolvedValue(existingUser);
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Program A",
    });
    mocked.enrollUserInProgram.mockResolvedValue({
      isNew: true,
      enrollment: { _id: "user-program-1" },
      program: { _id: { toString: () => programId }, name: "Program A" },
    });

    const req = {
      body: {
        name: "Existing Instructor",
        email: "teacher@example.com",
        role: "INSTRUCTOR",
        programId,
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.enrollUserInProgram).toHaveBeenCalledWith(
      "instructor-1",
      programId,
      expect.objectContaining({
        status: "ACTIVE",
        skipCapacityCheck: true,
        programRole: "INSTRUCTOR",
      })
    );
    expect(mocked.User).not.toHaveBeenCalled();
    expect(mocked.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "instructor-1",
        type: "SYSTEM",
        title: "Program assignment",
        data: expect.objectContaining({
          programId,
          programRole: "INSTRUCTOR",
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigned: true,
          alreadyAssigned: false,
          programRole: "INSTRUCTOR",
        }),
      })
    );
  });

  it("assigns an existing instructor to a cohort when provided", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";
    const existingUser = {
      _id: "instructor-1",
      name: "Existing Instructor",
      email: "teacher@example.com",
      role: "INSTRUCTOR",
      toPublicJSON: vi.fn(() => ({ id: "instructor-1" })),
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
      program: { _id: { toString: () => programId }, name: "Program A" },
    });

    const req = {
      body: {
        name: "Existing Instructor",
        email: "teacher@example.com",
        role: "INSTRUCTOR",
        programId,
        cohortId,
        roleInCohort: "MENTOR",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.UserCohort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "instructor-1",
        cohortId,
        roleInCohort: "MENTOR",
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("acknowledges existing admins without creating a program assignment", async () => {
    const existingUser = {
      _id: "admin-2",
      name: "Existing Admin",
      email: "admin@example.com",
      role: "ADMIN",
      toPublicJSON: vi.fn(() => ({ id: "admin-2", role: "ADMIN" })),
    };
    mocked.User.findByEmail.mockResolvedValue(existingUser);

    const req = {
      body: {
        name: "Existing Admin",
        email: "admin@example.com",
        role: "ADMIN",
        programId: "507f1f77bcf86cd799439012",
      },
      user: { _id: "admin-user-1" },
    };
    const res = createRes();

    await inviteUser(req, res);

    expect(mocked.enrollUserInProgram).not.toHaveBeenCalled();
    expect(mocked.UserCohort).not.toHaveBeenCalled();
    expect(mocked.createNotification).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigned: false,
          alreadyHasAccess: true,
        }),
      })
    );
  });

  it("rejects cross-role existing user program invites", async () => {
    mocked.User.findByEmail.mockResolvedValue({
      _id: "instructor-1",
      name: "Existing Instructor",
      email: "teacher@example.com",
      role: "INSTRUCTOR",
    });

    const req = {
      body: {
        name: "Existing Instructor",
        email: "teacher@example.com",
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

  it("uses row-level programCode and cohortName before modal fallback during Excel invite", async () => {
    const modalProgramId = "507f1f77bcf86cd799439011";
    const modalCohortId = "507f1f77bcf86cd799439012";
    const rowProgramId = "507f1f77bcf86cd799439013";
    const rowCohortId = "507f1f77bcf86cd799439014";

    mocked.ExcelService.processExcelFile.mockReturnValue({
      users: [
        {
          name: "Row Level User",
          email: "row@example.com",
          role: "PARTICIPANT",
          programCode: "ROW-101",
          cohortName: "Row Cohort",
          roleInCohort: "MEMBER",
        },
      ],
      errors: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
    });
    mocked.User.findByEmail.mockResolvedValue(null);
    mocked.Program.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: { toString: () => rowProgramId },
        code: "ROW-101",
        name: "Row Program",
      }),
    });
    mocked.Cohort.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: { toString: () => rowCohortId },
        name: "Row Cohort",
        programId: { toString: () => rowProgramId },
      }),
    });
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => rowCohortId },
      name: "Row Cohort",
      programId: { toString: () => rowProgramId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => rowProgramId },
      name: "Row Program",
    });
    mocked.User.mockImplementation(function User(data) {
      Object.assign(this, data);
      this._id = "invited-user-1";
      this.save = vi.fn().mockResolvedValue(this);
    });

    const req = {
      file: {
        buffer: Buffer.from("fake"),
        originalname: "bulk.xlsx",
      },
      body: {
        programId: modalProgramId,
        cohortId: modalCohortId,
        sendInvitationEmail: "false",
      },
      user: { _id: "admin-user-1", role: "ADMIN" },
    };
    const res = createRes();

    await bulkInviteUsersFromExcel(req, res);

    expect(mocked.User).toHaveBeenCalledWith(
      expect.objectContaining({
        cohortAssignment: expect.objectContaining({
          programId: rowProgramId,
          cohortId: rowCohortId,
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: expect.objectContaining({ successful: 1, failed: 0 }),
        }),
      })
    );
  });

  it("keeps modal program and cohort fallback for older Excel templates", async () => {
    const programId = "507f1f77bcf86cd799439012";
    const cohortId = "507f1f77bcf86cd799439013";

    mocked.ExcelService.processExcelFile.mockReturnValue({
      users: [
        {
          name: "Fallback User",
          email: "fallback@example.com",
          role: "PARTICIPANT",
          roleInCohort: "MEMBER",
        },
      ],
      errors: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
    });
    mocked.User.findByEmail.mockResolvedValue(null);
    mocked.Cohort.findById.mockResolvedValue({
      _id: { toString: () => cohortId },
      name: "Fallback Cohort",
      programId: { toString: () => programId },
      isFull: vi.fn(() => false),
    });
    mocked.Program.findById.mockResolvedValue({
      _id: { toString: () => programId },
      name: "Fallback Program",
    });
    mocked.User.mockImplementation(function User(data) {
      Object.assign(this, data);
      this._id = "fallback-user-1";
      this.save = vi.fn().mockResolvedValue(this);
    });

    const req = {
      file: { buffer: Buffer.from("fake"), originalname: "bulk.xlsx" },
      body: { programId, cohortId, sendInvitationEmail: "false" },
      user: { _id: "admin-user-1", role: "ADMIN" },
    };
    const res = createRes();

    await bulkInviteUsersFromExcel(req, res);

    expect(mocked.Program.findOne).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: expect.objectContaining({ successful: 1, failed: 0 }),
        }),
      })
    );
  });

  it("fails only the affected Excel row for an invalid programCode", async () => {
    mocked.ExcelService.processExcelFile.mockReturnValue({
      users: [
        {
          name: "Bad Program",
          email: "bad-program@example.com",
          role: "PARTICIPANT",
          programCode: "NOPE",
          cohortName: "Cohort 1",
        },
      ],
      errors: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
    });
    mocked.Program.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const req = {
      file: { buffer: Buffer.from("fake"), originalname: "bulk.xlsx" },
      body: { sendInvitationEmail: "false" },
      user: { _id: "admin-user-1", role: "ADMIN" },
    };
    const res = createRes();

    await bulkInviteUsersFromExcel(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          results: expect.objectContaining({
            failed: [
              expect.objectContaining({
                email: "bad-program@example.com",
                reason: expect.stringContaining('Program code "NOPE" was not found'),
              }),
            ],
          }),
          summary: expect.objectContaining({ successful: 0, failed: 1 }),
        }),
      })
    );
  });

  it("fails participant Excel rows without a resolved cohort", async () => {
    const rowProgramId = "507f1f77bcf86cd799439013";
    mocked.ExcelService.processExcelFile.mockReturnValue({
      users: [
        {
          name: "No Cohort",
          email: "no-cohort@example.com",
          role: "PARTICIPANT",
          programCode: "ROW-101",
        },
      ],
      errors: [],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
    });
    mocked.Program.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: { toString: () => rowProgramId },
        code: "ROW-101",
        name: "Row Program",
      }),
    });

    const req = {
      file: { buffer: Buffer.from("fake"), originalname: "bulk.xlsx" },
      body: { sendInvitationEmail: "false" },
      user: { _id: "admin-user-1", role: "ADMIN" },
    };
    const res = createRes();

    await bulkInviteUsersFromExcel(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          results: expect.objectContaining({
            failed: [
              expect.objectContaining({
                email: "no-cohort@example.com",
                reason: "Cohort is required when inviting a participant",
              }),
            ],
          }),
          summary: expect.objectContaining({ successful: 0, failed: 1 }),
        }),
      })
    );
  });
});

describe("userController Super Admin restrictions", () => {
  beforeEach(() => {
    mocked.User.mockReset();
    mocked.User.findByEmail.mockReset();
    mocked.User.findById.mockReset();
    mocked.User.findByIdAndUpdate.mockReset();
    mocked.User.findByIdAndDelete.mockReset();
  });

  it("rejects admin promoting a user to Super Admin", async () => {
    mocked.User.findById.mockResolvedValue({
      _id: "participant-1",
      role: "PARTICIPANT",
    });

    const req = {
      params: { id: "participant-1" },
      body: { role: "SUPER_ADMIN" },
      user: { _id: "admin-1", role: "ADMIN" },
    };
    const res = createRes();

    await updateUser(req, res);

    expect(mocked.User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "SUPER_ADMIN_REQUIRED",
        }),
      })
    );
  });

  it("allows Super Admin promoting a user to Super Admin", async () => {
    mocked.User.findById.mockResolvedValue({
      _id: "participant-1",
      role: "PARTICIPANT",
    });
    mocked.User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        toPublicJSON: vi.fn(() => ({
          id: "participant-1",
          role: "SUPER_ADMIN",
        })),
      }),
    });

    const req = {
      params: { id: "participant-1" },
      body: { role: "SUPER_ADMIN" },
      user: { _id: "super-1", role: "SUPER_ADMIN" },
    };
    const res = createRes();

    await updateUser(req, res);

    expect(mocked.User.findByIdAndUpdate).toHaveBeenCalledWith(
      "participant-1",
      { role: "SUPER_ADMIN" },
      { new: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });

  it("rejects admin editing an existing Super Admin", async () => {
    mocked.User.findById.mockResolvedValue({
      _id: "super-2",
      role: "SUPER_ADMIN",
    });

    const req = {
      params: { id: "super-2" },
      body: { name: "Changed" },
      user: { _id: "admin-1", role: "ADMIN" },
    };
    const res = createRes();

    await updateUser(req, res);

    expect(mocked.User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows Super Admin deleting another user", async () => {
    mocked.User.findByIdAndDelete.mockResolvedValue({
      _id: "participant-1",
      role: "PARTICIPANT",
    });

    const req = {
      params: { id: "participant-1" },
      user: { _id: { toString: () => "super-1" }, role: "SUPER_ADMIN" },
    };
    const res = createRes();

    await deleteUser(req, res);

    expect(mocked.User.findByIdAndDelete).toHaveBeenCalledWith("participant-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });

  it("rejects Super Admin deleting their own account", async () => {
    const req = {
      params: { id: "super-1" },
      user: { _id: { toString: () => "super-1" }, role: "SUPER_ADMIN" },
    };
    const res = createRes();

    await deleteUser(req, res);

    expect(mocked.User.findByIdAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "CANNOT_DELETE_SELF",
        }),
      })
    );
  });
});

describe("userController.downloadBulkInviteTemplate", () => {
  beforeEach(() => {
    mocked.ExcelService.generateTemplate.mockReset();
    mocked.ExcelService.generateTemplate.mockReturnValue(Buffer.from("template"));
    mocked.Program.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { code: "AIM-101", name: "AI Masterclass" },
      ]),
    });
  });

  it("includes Super Admin role options for Super Admin downloads", async () => {
    const req = {
      user: { _id: "super-1", role: "SUPER_ADMIN" },
    };
    const res = createRes();

    await downloadBulkInviteTemplate(req, res);

    expect(mocked.ExcelService.generateTemplate).toHaveBeenCalledWith({
      includeSuperAdmin: true,
      programs: [{ code: "AIM-101", name: "AI Masterclass" }],
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from("template"));
  });

  it("omits Super Admin role options for Admin downloads", async () => {
    const req = {
      user: { _id: "admin-1", role: "ADMIN" },
    };
    const res = createRes();

    await downloadBulkInviteTemplate(req, res);

    expect(mocked.ExcelService.generateTemplate).toHaveBeenCalledWith({
      includeSuperAdmin: false,
      programs: [{ code: "AIM-101", name: "AI Masterclass" }],
    });
    expect(res.send).toHaveBeenCalledWith(Buffer.from("template"));
  });
});
