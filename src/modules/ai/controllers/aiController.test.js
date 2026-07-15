import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  canAccessLessonProgress: vi.fn(),
  retrieveLessonContext: vi.fn(),
  askAiTutor: vi.fn(),
}));

vi.mock("../../courses/services/lessonProgressService.js", () => ({
  canAccessLessonProgress: mocked.canAccessLessonProgress,
}));

vi.mock("../services/lessonContextBuilder.js", () => ({
  retrieveLessonContext: mocked.retrieveLessonContext,
}));

vi.mock("../services/aiProvider.js", () => ({
  askAiTutor: mocked.askAiTutor,
}));

const { askTutor } = await import("./aiController.js");

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("aiController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects inaccessible tutor requests", async () => {
    mocked.canAccessLessonProgress.mockResolvedValue(false);
    const res = createRes();

    await askTutor(
      {
        body: {
          courseId: "course-1",
          lessonId: "lesson-1",
          userQuestion: "Explain this",
        },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.retrieveLessonContext).not.toHaveBeenCalled();
    expect(mocked.askAiTutor).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("builds server-owned lesson context and returns tutor output", async () => {
    mocked.canAccessLessonProgress.mockResolvedValue(true);
    mocked.retrieveLessonContext.mockResolvedValue({
      context: "Course: AI\nLesson: Prompting",
      sources: ["course", "lesson"],
      truncated: false,
    });
    mocked.askAiTutor.mockResolvedValue({
      answer: "This lesson explains prompting.",
      suggestions: ["Try an example"],
      confidence: 0.82,
    });
    const res = createRes();

    await askTutor(
      {
        body: {
          courseId: "course-1",
          lessonId: "lesson-1",
          userQuestion: "Explain this",
          intent: "explain",
          messages: [{ role: "user", content: "Hi" }],
        },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.retrieveLessonContext).toHaveBeenCalledWith({
      courseId: "course-1",
      lessonId: "lesson-1",
      userId: "user-1",
    });
    expect(mocked.askAiTutor).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Course: AI\nLesson: Prompting",
        userQuestion: "Explain this",
        intent: "explain",
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          answer: "This lesson explains prompting.",
          suggestions: ["Try an example"],
          confidence: 0.82,
        }),
      })
    );
  });
});
