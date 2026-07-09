import { beforeEach, describe, expect, it, vi } from "vitest";

const lessonIdPublished1 = "507f1f77bcf86cd799439011";
const lessonIdPublished2 = "507f1f77bcf86cd799439012";
const lessonIdUnpublished = "507f1f77bcf86cd799439013";
const userId = "507f1f77bcf86cd799439021";
const courseId = "507f1f77bcf86cd799439031";

const mocked = vi.hoisted(() => ({
  Lesson: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
  LessonProgress: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
  Enrollment: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/Lesson.js", () => ({
  Lesson: mocked.Lesson,
}));

vi.mock("../models/LessonProgress.js", () => ({
  LessonProgress: mocked.LessonProgress,
}));

vi.mock("../../enrollments/models/Enrollment.js", () => ({
  Enrollment: mocked.Enrollment,
}));

vi.mock("../../enrollments/services/enrollmentNotificationService.js", () => ({
  notifyEnrollmentCompletedIfNeeded: vi.fn(),
}));

const { getCourseProgressForUser } = await import("./lessonProgressService.js");

const createFindChain = (value) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
  return chain;
};

describe("getCourseProgressForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts only published lessons in totalCount", async () => {
    mocked.Lesson.find.mockReturnValue(
      createFindChain([
        { _id: lessonIdPublished1 },
        { _id: lessonIdPublished2 },
      ])
    );
    mocked.LessonProgress.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          lessonId: lessonIdPublished1,
          completed: true,
          completedStepIds: [],
          completedAt: new Date("2026-01-01"),
        },
      ]),
    });

    const result = await getCourseProgressForUser(userId, courseId);

    expect(mocked.Lesson.find).toHaveBeenCalledWith({
      courseId,
      isPublished: true,
    });
    expect(result.totalCount).toBe(2);
    expect(result.completedCount).toBe(1);
    expect(result.progressPct).toBe(50);
    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[0]).toMatchObject({
      lessonId: lessonIdPublished1,
      completed: true,
    });
    expect(result.lessons[1]).toMatchObject({
      lessonId: lessonIdPublished2,
      completed: false,
    });
  });

  it("excludes unpublished lesson completions from progressPct", async () => {
    mocked.Lesson.find.mockReturnValue(
      createFindChain([{ _id: lessonIdPublished1 }])
    );
    mocked.LessonProgress.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          lessonId: lessonIdUnpublished,
          completed: true,
          completedStepIds: [],
          completedAt: new Date("2026-01-01"),
        },
      ]),
    });

    const result = await getCourseProgressForUser(userId, courseId);

    expect(result.totalCount).toBe(1);
    expect(result.completedCount).toBe(0);
    expect(result.progressPct).toBe(0);
  });

  it("returns zero progress when there are no published lessons", async () => {
    mocked.Lesson.find.mockReturnValue(createFindChain([]));
    mocked.LessonProgress.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    const result = await getCourseProgressForUser(userId, courseId);

    expect(result).toEqual({
      progressPct: 0,
      completedCount: 0,
      totalCount: 0,
      lessons: [],
    });
  });
});
