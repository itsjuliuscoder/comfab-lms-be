import { describe, expect, it } from "vitest";
import enrollmentRoutes from "./enrollments.js";

const getRoutePaths = () =>
  enrollmentRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

describe("enrollment routes", () => {
  it("registers admin routes before generic enrollment id routes", () => {
    const paths = getRoutePaths();

    expect(paths.indexOf("/admin/all")).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf("/admin/courses/:courseId/stats")).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf("/:id")).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf("/admin/all")).toBeLessThan(paths.indexOf("/:id"));
    expect(paths.indexOf("/admin/courses/:courseId/stats")).toBeLessThan(
      paths.indexOf("/:id")
    );
  });
});
