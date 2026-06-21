import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const User = vi.fn();
  User.findByEmail = vi.fn();
  User.findById = vi.fn();

  return {
    User,
    sendWelcomeEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    generateTokens: vi.fn(() => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })),
    verifyRefreshToken: vi.fn(),
  };
});

vi.mock("../../users/models/User.js", () => ({
  User: mocked.User,
}));

vi.mock("../../../config/email.js", () => ({
  sendWelcomeEmail: mocked.sendWelcomeEmail,
  sendPasswordResetEmail: mocked.sendPasswordResetEmail,
}));

vi.mock("../../../middleware/auth.js", () => ({
  generateTokens: mocked.generateTokens,
  verifyRefreshToken: mocked.verifyRefreshToken,
}));

const { register } = await import("./authController.js");

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
    mocked.sendWelcomeEmail.mockReset();
    mocked.generateTokens.mockClear();
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
