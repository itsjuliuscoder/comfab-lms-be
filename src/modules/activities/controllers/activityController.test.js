import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  logActivity: vi.fn(),
}));

vi.mock("../services/activityService.js", () => ({
  default: {
    logActivity: mocked.logActivity,
  },
}));

const { createActivity } = await import("./activityController.js");

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("activityController.createActivity", () => {
  beforeEach(() => {
    mocked.logActivity.mockReset();
  });

  it("accepts backend-supported auth activity names", async () => {
    mocked.logActivity.mockResolvedValue({
      _id: "activity-1",
      action: "USER_LOGOUT",
    });

    const req = {
      body: {
        action: "USER_LOGOUT",
        actor: {
          userId: "admin-user-1",
          name: "Codex Admin",
          email: "codex.admin@example.com",
          role: "ADMIN",
        },
        target: {
          type: "USER",
          model: "User",
        },
        context: {
          description: "User logged out",
          source: "WEB_APP",
        },
      },
      ip: "127.0.0.1",
      get: vi.fn(() => "vitest"),
    };
    const res = createRes();

    await createActivity(req, res);

    expect(mocked.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_LOGOUT",
        actor: expect.objectContaining({ role: "ADMIN" }),
        target: expect.objectContaining({ type: "USER" }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({ action: "USER_LOGOUT" }),
      })
    );
  });

  it("returns a server error when activity persistence rejects an unsupported action", async () => {
    mocked.logActivity.mockResolvedValue(null);

    const req = {
      body: {
        action: "LOGOUT",
        actor: {
          userId: "admin-user-1",
          name: "Codex Admin",
          email: "codex.admin@example.com",
          role: "ADMIN",
        },
        target: {
          type: "USER",
          model: "User",
        },
      },
      ip: "127.0.0.1",
      get: vi.fn(() => "vitest"),
    };
    const res = createRes();

    await createActivity(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "Failed to create activity",
        }),
      })
    );
  });
});
