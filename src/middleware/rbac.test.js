import { describe, expect, it, vi } from "vitest";
import { requireRole } from "./rbac.js";

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("requireRole", () => {
  it("allows roles passed as an array", () => {
    const req = { user: { role: "ADMIN" } };
    const res = createRes();
    const next = vi.fn();

    requireRole(["ADMIN", "INSTRUCTOR"])(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects roles outside an array allow-list", () => {
    const req = { user: { role: "PARTICIPANT" } };
    const res = createRes();
    const next = vi.fn();

    requireRole(["ADMIN", "INSTRUCTOR"])(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "Access denied. Required roles: ADMIN, INSTRUCTOR",
        }),
      })
    );
  });
});
