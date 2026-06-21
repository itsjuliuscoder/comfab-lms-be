import { describe, expect, it } from "vitest";
import authRoutes from "./auth.js";

describe("auth routes", () => {
  it("does not expose the debug token route", () => {
    const paths = authRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    expect(paths).not.toContain("/debug-token");
  });
});
