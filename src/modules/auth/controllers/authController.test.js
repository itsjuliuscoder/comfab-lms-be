import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findByEmail = vi.fn();
  User.findById = vi.fn();
  User.findOne = vi.fn();

  return {
    User,
    sendWelcomeEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    generateTokens: vi.fn(() => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })),
    verifyRefreshToken: vi.fn(),
    createNotification: vi.fn(),
    enrollUserInProgram: vi.fn(),
  };
});

vi.mock("../../users/models/User.js", () => ({
  User: mocked.User,
}));

vi.mock("../../../config/email.js", () => ({
  sendWelcomeEmail: mocked.sendWelcomeEmail,
  sendPasswordResetEmail: mocked.sendPasswordResetEmail,
}));

vi.mock("../../../utils/emailVerification.js", () => ({
  sendUserVerificationEmail: vi.fn(),
}));

vi.mock("../../../middleware/auth.js", () => ({
  generateTokens: mocked.generateTokens,
  verifyRefreshToken: mocked.verifyRefreshToken,
}));

vi.mock("../../notifications/services/notificationService.js", () => ({
  createNotification: mocked.createNotification,
  notifyAdmins: vi.fn(),
}));

vi.mock("../../programs/services/programEnrollmentService.js", () => ({
  enrollUserInProgram: mocked.enrollUserInProgram,
}));

const { completeInvite, register } = await import("./authController.js");

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("authController.register", () => {
  beforeEach(() => {
    mocked.User.mockReset();
    mocked.User.findByEmail.mockReset();
    mocked.User.findById.mockReset();
    mocked.User.findOne.mockReset();
    mocked.sendWelcomeEmail.mockReset();
    mocked.generateTokens.mockClear();
    mocked.createNotification.mockReset();
    mocked.enrollUserInProgram.mockReset();
  });

  it("forces public registration to create participants", async () => {
    mocked.User.findByEmail.mockResolvedValue(null);
    mocked.User.mockImplementation(function User(data) {
      Object.assign(this, data);
      this._id = "user-1";
      this.save = vi.fn().mockResolvedValue(this);
      this.toPublicJSON = vi.fn(() => ({
        id: "user-1",
        name: this.name,
        email: this.email,
        role: this.role,
      }));
    });

    const req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "ADMIN",
      },
    };
    const res = createRes();

    await register(req, res);

    expect(mocked.User).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "PARTICIPANT",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ role: "PARTICIPANT" }),
        }),
      })
    );
  });
});

describe("authController.completeInvite", () => {
  beforeEach(() => {
    mocked.User.findById.mockReset();
    mocked.User.findOne.mockReset();
    mocked.generateTokens.mockClear();
    mocked.createNotification.mockReset();
  });

  const createInvitedUser = (overrides = {}) => ({
    _id: { toString: () => "invited-user-1" },
    name: "Invited User",
    email: "invited@example.com",
    role: "PARTICIPANT",
    inviteToken: "token-123",
    inviteTokenExpires: new Date(Date.now() + 60_000),
    invitedBy: "admin-1",
    cohortAssignment: null,
    save: vi.fn().mockResolvedValue(undefined),
    toPublicJSON: vi.fn(() => ({
      id: "invited-user-1",
      name: "Invited User",
      email: "invited@example.com",
      role: "PARTICIPANT",
    })),
    ...overrides,
  });

  const createInviterQuery = (inviter) => ({
    select: vi.fn().mockResolvedValue(inviter),
  });

  it("notifies the inviting Admin when an invite is completed", async () => {
    const invitedUser = createInvitedUser();
    mocked.User.findOne.mockResolvedValue(invitedUser);
    mocked.User.findById.mockReturnValue(
      createInviterQuery({
        _id: { toString: () => "admin-1" },
        role: "ADMIN",
      })
    );

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.objectContaining({ toString: expect.any(Function) }),
        type: "SYSTEM",
        title: "Invite accepted",
        message: "Invited User accepted your invitation and completed signup.",
        link: "/dashboard/users",
        priority: "MEDIUM",
        data: expect.objectContaining({
          invitedUserId: "invited-user-1",
          invitedUserEmail: "invited@example.com",
          invitedUserRole: "PARTICIPANT",
          inviterId: "admin-1",
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
      })
    );
  });

  it("notifies the inviting Super Admin when an invite is completed", async () => {
    const invitedUser = createInvitedUser({ invitedBy: "super-1" });
    mocked.User.findOne.mockResolvedValue(invitedUser);
    mocked.User.findById.mockReturnValue(
      createInviterQuery({
        _id: { toString: () => "super-1" },
        role: "SUPER_ADMIN",
      })
    );

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.createNotification).toHaveBeenCalledOnce();
    expect(mocked.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inviterId: "super-1",
        }),
      })
    );
  });

  it("does not notify when invitedBy is missing", async () => {
    const invitedUser = createInvitedUser({ invitedBy: null });
    mocked.User.findOne.mockResolvedValue(invitedUser);

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.User.findById).not.toHaveBeenCalled();
    expect(mocked.createNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("does not notify when inviter is not an Admin or Super Admin", async () => {
    const invitedUser = createInvitedUser();
    mocked.User.findOne.mockResolvedValue(invitedUser);
    mocked.User.findById.mockReturnValue(
      createInviterQuery({
        _id: { toString: () => "instructor-1" },
        role: "INSTRUCTOR",
      })
    );

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.createNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("does not block invite completion when notification creation fails", async () => {
    const invitedUser = createInvitedUser();
    mocked.User.findOne.mockResolvedValue(invitedUser);
    mocked.User.findById.mockReturnValue(
      createInviterQuery({
        _id: { toString: () => "admin-1" },
        role: "ADMIN",
      })
    );
    mocked.createNotification.mockRejectedValue(new Error("notification failed"));

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.createNotification).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("creates instructor program assignment when an invited instructor completes signup", async () => {
    const invitedUser = createInvitedUser({
      role: "INSTRUCTOR",
      cohortAssignment: {
        programId: "program-1",
        cohortId: null,
        roleInCohort: "MEMBER",
      },
      toPublicJSON: vi.fn(() => ({
        id: "invited-user-1",
        name: "Invited User",
        email: "invited@example.com",
        role: "INSTRUCTOR",
      })),
    });
    mocked.User.findOne.mockResolvedValue(invitedUser);
    mocked.User.findById.mockReturnValue(
      createInviterQuery({
        _id: { toString: () => "admin-1" },
        role: "ADMIN",
      })
    );

    const req = { body: { token: "token-123", password: "password123" } };
    const res = createRes();

    await completeInvite(req, res);

    expect(mocked.enrollUserInProgram).toHaveBeenCalledWith(
      invitedUser._id,
      "program-1",
      expect.objectContaining({
        status: "ACTIVE",
        skipCapacityCheck: true,
        programRole: "INSTRUCTOR",
      })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
