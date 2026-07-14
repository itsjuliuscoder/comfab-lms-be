import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRAM_NAMES, parseArgs } from "./deleteProgramCourses.js";

describe("deleteProgramCourses CLI options", () => {
  it("defaults to dry run for both requested programs", () => {
    expect(parseArgs([])).toEqual({
      confirm: false,
      allowMissingPrograms: false,
      programNames: DEFAULT_PROGRAM_NAMES,
    });
  });

  it("supports confirmed deletion and missing program override", () => {
    expect(parseArgs(["--confirm", "--allow-missing-programs"])).toEqual({
      confirm: true,
      allowMissingPrograms: true,
      programNames: DEFAULT_PROGRAM_NAMES,
    });
  });

  it("supports one or more explicit program names", () => {
    expect(
      parseArgs([
        "--program",
        "AI Masterclass",
        "--program=Purpose Discovery",
        "--program",
        "AI Masterclass",
      ])
    ).toEqual({
      confirm: false,
      allowMissingPrograms: false,
      programNames: ["AI Masterclass", "Purpose Discovery"],
    });
  });

  it("rejects unknown arguments", () => {
    expect(() => parseArgs(["--force"])).toThrow("Unknown argument: --force");
  });

  it("requires a value for --program", () => {
    expect(() => parseArgs(["--program"])).toThrow(
      "--program requires a program name"
    );
  });
});
