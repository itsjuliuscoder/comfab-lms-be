import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock("../modules/users/models/User.js", () => ({
  User: mocked.User,
}));

const { generateTokens, verifyRefreshToken, requireAuth } = await import(
  "./auth.js"
);

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("auth middleware token separation", () => {
  beforeEach(() => {
    mocked.User.findById.mockReset();
  });

  it("rejects access tokens in refresh-token verification", () => {
    const { accessToken, refreshToken } = generateTokens("user-1");

    expect(() => verifyRefreshToken(accessToken)).toThrow("Invalid refresh token");
    expect(verifyRefreshToken(refreshToken)).toEqual(
      expect.objectContaining({
        userId: "user-1",
        tokenType: "refresh",
      })
    );
  });

  it("rejects refresh tokens for authenticated access", async () => {
    const { refreshToken } = generateTokens("user-1");
    const req = {
      headers: {
        authorization: `Bearer ${refreshToken}`,
      },
    };
    const res = createRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mocked.User.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "Invalid token",
        }),
      })
    );
  });
});
