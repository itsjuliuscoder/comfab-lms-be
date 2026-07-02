import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findById = vi.fn();
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

const { resendInvite } = await import("./userController.js");

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("userController.resendInvite", () => {
  beforeEach(() => {
    mocked.User.findById.mockReset();
    mocked.sendInvitationEmail.mockReset();
  });

  it("returns 404 when user is not found", async () => {
    const select = vi.fn().mockResolvedValue(null);
    mocked.User.findById.mockReturnValue({ select });

    const req = { params: { id: "missing-user" }, user: { _id: "admin-1" } };
    const res = createRes();

    await resendInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when user has already onboarded", async () => {
    const select = vi.fn().mockResolvedValue({
      inviteToken: null,
      password: "hashed-password",
    });
    mocked.User.findById.mockReturnValue({ select });

    const req = { params: { id: "user-1" }, user: { _id: "admin-1" } };
    const res = createRes();

    await resendInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "USER_ALREADY_ONBOARDED",
        }),
      })
    );
  });

  it("regenerates invite token and sends email for pending users", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const toPublicJSON = vi.fn(() => ({
      _id: "user-1",
      email: "pending@example.com",
      invitePending: true,
    }));

    const select = vi.fn().mockResolvedValue({
      inviteToken: "old-token",
      inviteTokenExpires: new Date(),
      email: "pending@example.com",
      save,
      toPublicJSON,
    });
    mocked.User.findById.mockReturnValue({ select });
    mocked.sendInvitationEmail.mockResolvedValue(undefined);

    const req = {
      params: { id: "user-1" },
      user: { _id: "admin-1", name: "Admin", email: "admin@example.com" },
    };
    const res = createRes();

    await resendInvite(req, res);

    expect(save).toHaveBeenCalled();
    expect(mocked.sendInvitationEmail).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ invitePending: true }),
        }),
      })
    );
  });
});
