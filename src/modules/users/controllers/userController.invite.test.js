import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findByEmail = vi.fn();

  return {
    User,
    sendInvitationEmail: vi.fn(),
  };
});

vi.mock("../models/User.js", () => ({
  User: mocked.User,
}));

vi.mock("../../../config/email.js", () => ({
  sendInvitationEmail: mocked.sendInvitationEmail,
}));

const { inviteUser } = await import("./userController.js");

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
    mocked.sendInvitationEmail.mockReset();
  });

  it("creates an invited user with a plus-alias email and no password", async () => {
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
        role: "PARTICIPANT",
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
        role: "PARTICIPANT",
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
});
