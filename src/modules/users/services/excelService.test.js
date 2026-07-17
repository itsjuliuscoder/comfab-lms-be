import { describe, expect, it } from "vitest";
import XLSX from "xlsx";
import ExcelService from "./excelService.js";

const readTemplate = (options) =>
  XLSX.read(ExcelService.generateTemplate(options), { type: "buffer" });

const sheetRows = (workbook, sheetName) =>
  XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  });

describe("ExcelService.generateTemplate", () => {
  it("creates Users and Instructions sheets with expected headers and samples", () => {
    const workbook = readTemplate({
      includeSuperAdmin: false,
      programs: [{ code: "AIM-101", name: "AI Masterclass" }],
    });

    expect(workbook.SheetNames).toEqual(["Users", "Programs", "Instructions"]);

    const usersRows = sheetRows(workbook, "Users");
    expect(usersRows[0]).toEqual(["name", "email", "role", "programCode", "cohortName", "roleInCohort"]);
    expect(usersRows).toEqual(
      expect.arrayContaining([
        ["Ada Participant", "ada.participant@example.com", "PARTICIPANT", "AIM-101", "Cohort 1", "MEMBER"],
        ["Tunde Instructor", "tunde.instructor@example.com", "INSTRUCTOR", "AIM-101", "", "MENTOR"],
      ])
    );

    expect(sheetRows(workbook, "Programs")).toEqual([
      ["programCode", "programName"],
      ["AIM-101", "AI Masterclass"],
    ]);
  });

  it("omits SUPER_ADMIN from Admin templates", () => {
    const workbook = readTemplate({ includeSuperAdmin: false });
    const instructionsText = sheetRows(workbook, "Instructions").flat().join(" ");
    const usersText = sheetRows(workbook, "Users").flat().join(" ");

    expect(instructionsText).toContain("ADMIN, INSTRUCTOR, PARTICIPANT");
    expect(instructionsText).not.toContain("SUPER_ADMIN");
    expect(usersText).not.toContain("SUPER_ADMIN");
  });

  it("includes SUPER_ADMIN in Super Admin templates", () => {
    const workbook = readTemplate({ includeSuperAdmin: true });
    const instructionsText = sheetRows(workbook, "Instructions").flat().join(" ");
    const usersRows = sheetRows(workbook, "Users");

    expect(instructionsText).toContain("SUPER_ADMIN, ADMIN, INSTRUCTOR, PARTICIPANT");
    expect(usersRows).toEqual(
      expect.arrayContaining([
        ["Root Admin", "super.admin@example.com", "SUPER_ADMIN", "", "", "MEMBER"],
      ])
    );
  });

  it("extracts optional programCode and cohortName columns from uploaded rows", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["name", "email", "role", "programCode", "cohortName", "roleInCohort"],
      ["Learner One", "learner@example.com", "PARTICIPANT", "aim-101", "Cohort 1", "LEADER"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const result = ExcelService.processExcelFile(buffer);

    expect(result.users).toEqual([
      {
        name: "Learner One",
        email: "learner@example.com",
        role: "PARTICIPANT",
        programCode: "AIM-101",
        cohortName: "Cohort 1",
        roleInCohort: "LEADER",
      },
    ]);
  });
});
