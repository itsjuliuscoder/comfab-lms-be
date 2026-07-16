import { describe, expect, it, vi } from "vitest";
import { requireAdmin, requireRole, requireSuperAdmin } from "./rbac.js";

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

describe("platform admin guards", () => {
  it("allows SUPER_ADMIN through requireAdmin", () => {
    const req = { user: { role: "SUPER_ADMIN" } };
    const res = createRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN through requireSuperAdmin", () => {
    const req = { user: { role: "SUPER_ADMIN" } };
    const res = createRes();
    const next = vi.fn();

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "INSTRUCTOR", "PARTICIPANT"])(
    "rejects %s through requireSuperAdmin",
    (role) => {
      const req = { user: { role } };
      const res = createRes();
      const next = vi.fn();

      requireSuperAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: "Access denied. Required roles: SUPER_ADMIN",
          }),
        })
      );
    }
  );
});
