import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const Course = vi.fn(function Course(data) {
    Object.assign(this, data);
    this._id = "course-2";
    this.save = vi.fn().mockResolvedValue(this);
  });
  Course.countDocuments = vi.fn();
  Course.find = vi.fn();
  Course.findById = vi.fn();
  Course.findByIdAndUpdate = vi.fn();

  const Section = {
    find: vi.fn(),
    findById: vi.fn(),
  };

  const Lesson = vi.fn(function Lesson(data) {
    Object.assign(this, data);
    this._id = "lesson-1";
    this.save = vi.fn().mockResolvedValue(this);
  });
  Lesson.find = vi.fn();
  Lesson.findOne = vi.fn();
  Lesson.deleteOne = vi.fn();

  const LessonNote = vi.fn(function LessonNote(data) {
    Object.assign(this, data);
    this._id = "note-1";
    this.createdAt = new Date("2026-07-14T10:00:00.000Z");
    this.updatedAt = new Date("2026-07-14T10:00:00.000Z");
    this.save = vi.fn().mockResolvedValue(this);
  });
  LessonNote.find = vi.fn();
  LessonNote.findOneAndUpdate = vi.fn();
  LessonNote.findOneAndDelete = vi.fn();
  LessonNote.deleteMany = vi.fn();

  const LessonDiscussion = vi.fn(function LessonDiscussion(data) {
    Object.assign(this, data);
    this._id = "discussion-1";
    this.createdAt = new Date("2026-07-14T10:00:00.000Z");
    this.updatedAt = new Date("2026-07-14T10:00:00.000Z");
    this.replies = [];
    this.save = vi.fn().mockResolvedValue(this);
    this.populate = vi.fn().mockResolvedValue(this);
  });
  LessonDiscussion.create = vi.fn();
  LessonDiscussion.find = vi.fn();
  LessonDiscussion.findOne = vi.fn();
  LessonDiscussion.deleteMany = vi.fn();

  const InteractiveStepSubmission = {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
  };

  const CourseMaterial = {
    find: vi.fn(),
    deleteMany: vi.fn(),
  };

  const Task = {
    find: vi.fn(),
    deleteMany: vi.fn(),
  };

  const TaskSubmission = {
    deleteMany: vi.fn(),
  };

  return {
    Course,
    Section,
    Lesson,
    LessonNote,
    LessonDiscussion,
    InteractiveStepSubmission,
    CourseMaterial,
    Task,
    TaskSubmission,
    LessonProgress: {
      findOneAndUpdate: vi.fn(),
      deleteMany: vi.fn(),
    },
    Cohort: {
      find: vi.fn(),
    },
    Enrollment: {
      find: vi.fn(),
    },
    Program: {
      findById: vi.fn(),
    },
  };
});

vi.mock("../models/Course.js", () => ({
  Course: mocked.Course,
}));

vi.mock("../models/Section.js", () => ({
  Section: mocked.Section,
}));

vi.mock("../models/Lesson.js", () => ({
  Lesson: mocked.Lesson,
}));

vi.mock("../models/LessonNote.js", () => ({
  LessonNote: mocked.LessonNote,
}));

vi.mock("../models/LessonDiscussion.js", () => ({
  LessonDiscussion: mocked.LessonDiscussion,
}));

vi.mock("../models/InteractiveStepSubmission.js", () => ({
  InteractiveStepSubmission: mocked.InteractiveStepSubmission,
}));

vi.mock("../models/CourseMaterial.js", () => ({
  CourseMaterial: mocked.CourseMaterial,
}));

vi.mock("../models/LessonProgress.js", () => ({
  LessonProgress: mocked.LessonProgress,
}));

vi.mock("../../tasks/models/Task.js", () => ({
  Task: mocked.Task,
}));

vi.mock("../../tasks/models/TaskSubmission.js", () => ({
  TaskSubmission: mocked.TaskSubmission,
}));

vi.mock("../services/cloudinaryService.js", () => ({
  deleteCourseMaterial: vi.fn().mockResolvedValue({ result: "ok" }),
}));

vi.mock("../services/lessonProgressService.js", () => ({
  assertObjectIds: vi.fn(),
  getLessonInCourse: vi.fn().mockResolvedValue({ _id: "lesson-1" }),
  canAccessLessonProgress: vi.fn().mockResolvedValue(true),
  getCourseProgressForUser: vi.fn().mockResolvedValue({
    progressPct: 0,
    completedCount: 0,
    totalCount: 0,
    lessons: [],
  }),
  syncEnrollmentProgressFromLessons: vi.fn(),
}));

vi.mock("../../cohorts/models/Cohort.js", () => ({
  Cohort: mocked.Cohort,
}));

vi.mock("../../enrollments/models/Enrollment.js", () => ({
  Enrollment: mocked.Enrollment,
}));

vi.mock("../../programs/models/Program.js", () => ({
  default: mocked.Program,
}));

const {
  getAllCourses,
  getCourseById,
  getCourseSections,
  createCourse,
  publishCourse,
  unpublishCourse,
  getSectionLessons,
  createLesson,
  deleteLesson,
  createNote,
  getLessonNotes,
  updateNote,
  deleteNote,
  getDiscussions,
  createDiscussion,
  deleteDiscussion,
  addReply,
  submitInteractiveStep,
  updateCourse,
} = await import("./courseController.js");

const { canAccessLessonProgress } = await import("../services/lessonProgressService.js");

const createFindChain = (value) => {
  const chain = {
    populate: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue(value),
  };
  return chain;
};

const createPopulatePromise = (value) => {
  const promise = Promise.resolve(value);
  promise.populate = vi.fn(() => promise);
  return promise;
};

const createDiscussionFindChain = (value) => {
  const chain = {
    populate: vi.fn(() => chain),
    sort: vi.fn().mockResolvedValue(value),
  };
  return chain;
};

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("courseController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.Program.findById.mockResolvedValue({ _id: "program-1" });
  });

  it("supports programId filtering and returns a courses alias", async () => {
    mocked.Course.countDocuments.mockResolvedValue(1);
    mocked.Course.find.mockReturnValue(
      createFindChain([
        {
          _id: "course-1",
          id: "course-1",
          title: "AI Masterclass: Beginner",
          summary: "Intro course",
          difficulty: "BEGINNER",
          toObject() {
            return this;
          },
        },
      ])
    );

    const res = createRes();

    await getAllCourses(
      {
        query: {
          programId: "program-1",
        },
      },
      res
    );

    expect(mocked.Course.countDocuments).toHaveBeenCalledWith({
      programId: "program-1",
      status: "PUBLISHED",
      isPublic: true,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          courses: [
            expect.objectContaining({
              id: "course-1",
              level: "Beginner",
            }),
          ],
        }),
      })
    );
  });

  it("denies anonymous detail access to a private course", async () => {
    mocked.Course.findById.mockReturnValue(
      createPopulatePromise({
        _id: "course-private",
        status: "PUBLISHED",
        isPublic: false,
        ownerId: { _id: "owner-1", toString: () => "owner-1" },
      })
    );

    const res = createRes();
    await getCourseById({ params: { id: "course-private" } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ message: "Access denied" }),
      })
    );
  });

  it("returns a sanitized curriculum summary to public visitors", async () => {
    mocked.Course.findById.mockResolvedValue({
      _id: "course-1",
      status: "PUBLISHED",
      isPublic: true,
      ownerId: { toString: () => "owner-1" },
    });
    const sectionChain = {
      sort: vi.fn(() => sectionChain),
      populate: vi.fn().mockResolvedValue([
        {
          toObject: () => ({
            _id: "section-1",
            title: "Foundations",
            description: "Core ideas",
            order: 1,
            lessons: [
              {
                title: "Private video",
                isPublished: true,
                durationSec: 600,
                contentUrl: "https://private.example/video",
              },
            ],
          }),
        },
      ]),
    };
    mocked.Section.find.mockReturnValue(sectionChain);

    const res = createRes();
    await getCourseSections({ params: { id: "course-1" } }, res);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.ok).toBe(true);
    expect(responseBody.data.sections[0]).toEqual(
      expect.objectContaining({
        title: "Foundations",
        lessonCount: 1,
        estimatedDuration: 10,
      })
    );
    expect(responseBody.data.sections[0]).not.toHaveProperty("lessons");
    expect(JSON.stringify(responseBody)).not.toContain("private.example");
  });

  it("returns a direct course object from createCourse", async () => {
    mocked.Cohort.find.mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    mocked.Course.findById.mockReturnValue(
      createPopulatePromise({
        _id: "course-2",
        id: "course-2",
        title: "AI Masterclass: Intermediate",
        summary: "Intermediate course",
        difficulty: "INTERMEDIATE",
        toObject() {
          return this;
        },
      })
    );

    mocked.Course.mockImplementationOnce(function Course(data) {
      Object.assign(this, data);
      this._id = "course-2";
      this.save = vi.fn().mockResolvedValue(this);
    });

    const res = createRes();

    await createCourse(
      {
        body: {
          title: "AI Masterclass: Intermediate",
          summary: "Intermediate course",
          programId: "program-1",
        },
        user: { _id: "owner-1" },
      },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          id: "course-2",
          title: "AI Masterclass: Intermediate",
        }),
      })
    );
  });

  it("creates a course with validated cohort assignments", async () => {
    const cohortId = "111111111111111111111111";
    mocked.Cohort.find.mockImplementation((query) => ({
      select: vi.fn().mockResolvedValue(
        query.programId === "program-1"
          ? [
              {
                _id: cohortId,
                id: cohortId,
                name: "Cohort 1",
                status: "ACTIVE",
                programId: "program-1",
                toObject() {
                  return this;
                },
              },
            ]
          : []
      ),
    }));
    mocked.Course.findById.mockReturnValue(
      createPopulatePromise({
        _id: "course-3",
        id: "course-3",
        title: "AI Masterclass Cohort 1",
        summary: "Cohort course",
        cohortIds: [
          {
            _id: "cohort-1",
            id: "cohort-1",
            name: "Cohort 1",
            status: "ACTIVE",
            programId: "program-1",
            toObject() {
              return this;
            },
          },
        ],
        toObject() {
          return this;
        },
      })
    );

    const res = createRes();

    await createCourse(
      {
        body: {
        title: "AI Masterclass Cohort 1",
        summary: "Cohort course",
        programId: "program-1",
          cohortIds: [cohortId, cohortId],
        },
        user: { _id: "owner-1" },
      },
      res
    );

    expect(mocked.Cohort.find).toHaveBeenCalledWith({
      _id: { $in: [cohortId] },
      programId: "program-1",
    });
    expect(mocked.Course).toHaveBeenCalledWith(
      expect.objectContaining({
        cohortIds: [cohortId],
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          cohortCount: 1,
          cohorts: [expect.objectContaining({ name: "Cohort 1" })],
        }),
      })
    );
  });

  it("rejects cohort assignments outside the course program", async () => {
    const cohortId = "222222222222222222222222";
    mocked.Cohort.find.mockImplementation((query) => ({
      select: vi.fn().mockResolvedValue(
        query.programId === "program-1"
          ? []
          : [
              {
                _id: cohortId,
                id: cohortId,
                name: "Cohort 9",
                status: "ACTIVE",
                programId: "different-program",
                toObject() {
                  return this;
                },
              },
            ]
      ),
    }));

    const res = createRes();

    await createCourse(
      {
        body: {
          title: "AI Masterclass Cohort 1",
          summary: "Cohort course",
          programId: "program-1",
          cohortIds: [cohortId],
        },
        user: { _id: "owner-1" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "INVALID_COHORT_PROGRAM",
        }),
      })
    );
  });

  it("updates course cohort assignments", async () => {
    const currentCohortId = "333333333333333333333333";
    const nextCohortId = "444444444444444444444444";
    mocked.Cohort.find.mockImplementation((query) => ({
      select: vi.fn().mockResolvedValue(
        query.programId === "program-1"
          ? [
              {
                _id: nextCohortId,
                id: nextCohortId,
                name: "Cohort 2",
                status: "ACTIVE",
                programId: "program-1",
                toObject() {
                  return this;
                },
              },
            ]
          : []
      ),
    }));
    mocked.Course.findById.mockResolvedValue({
      _id: "course-4",
      ownerId: { toString: () => "owner-1" },
      programId: { toString: () => "program-1" },
      cohortIds: [currentCohortId],
    });
    mocked.Course.findByIdAndUpdate.mockReturnValue(
      createPopulatePromise({
        _id: "course-4",
        id: "course-4",
        title: "AI Masterclass Cohort 1",
        summary: "Updated cohort course",
        cohortIds: [
          {
            _id: nextCohortId,
            id: nextCohortId,
            name: "Cohort 2",
            status: "ACTIVE",
            programId: "program-1",
            toObject() {
              return this;
            },
          },
        ],
        toObject() {
          return this;
        },
      })
    );

    const res = createRes();

    await updateCourse(
      {
        params: { id: "course-4" },
        body: {
          cohortIds: [nextCohortId],
        },
        user: { _id: "owner-1", role: "INSTRUCTOR" },
      },
      res
    );

    expect(mocked.Course.findByIdAndUpdate).toHaveBeenCalledWith(
      "course-4",
      expect.objectContaining({ cohortIds: [nextCohortId] }),
      expect.objectContaining({ new: true, runValidators: true })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          cohortCount: 1,
          cohorts: [expect.objectContaining({ name: "Cohort 2" })],
        }),
      })
    );
  });

  it("publishes and unpublishes a course", async () => {
    const course = {
      _id: "course-1",
      ownerId: { toString: () => "owner-1" },
      status: "DRAFT",
      publishedAt: null,
      estimatedDuration: 0,
      save: vi.fn().mockResolvedValue(undefined),
      populate: vi.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          id: "course-1",
          title: "AI Masterclass",
          status: this.status,
          estimatedDuration: this.estimatedDuration,
        };
      },
    };
    mocked.Course.findById.mockResolvedValue(course);
    mocked.Section.find.mockResolvedValue([]);

    const publishRes = createRes();
    await publishCourse(
      { params: { id: "course-1" }, user: { _id: "owner-1", role: "INSTRUCTOR" } },
      publishRes
    );
    expect(course.status).toBe("PUBLISHED");
    expect(course.estimatedDuration).toBeNull();

    const unpublishRes = createRes();
    await unpublishCourse(
      { params: { id: "course-1" }, user: { _id: "owner-1", role: "INSTRUCTOR" } },
      unpublishRes
    );
    expect(course.status).toBe("DRAFT");
    expect(course.publishedAt).toBeNull();
  });

  it("returns lessons as a plain array", async () => {
    mocked.Course.findById.mockResolvedValue({
      _id: "course-1",
      ownerId: { toString: () => "owner-1" },
      status: "PUBLISHED",
      isPublic: true,
    });
    mocked.Section.findById.mockResolvedValue({
      _id: "section-1",
      courseId: { toString: () => "course-1" },
    });
    mocked.Lesson.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { _id: "lesson-1", title: "Prompt Lab", isPublished: true, toObject() { return this; } },
      ]),
    });

    const res = createRes();

    await getSectionLessons(
      {
        params: { id: "course-1", sectionId: "section-1" },
        query: {},
      },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ title: "Prompt Lab" })],
      })
    );
  });

  it("accepts INTERACTIVE lessons during creation", async () => {
    mocked.Course.findById.mockResolvedValue({
      _id: "course-1",
      ownerId: { toString: () => "owner-1" },
      estimatedDuration: null,
    });
    mocked.Section.findById.mockResolvedValue({
      _id: "section-1",
    });
    mocked.Lesson.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    });

    const res = createRes();

    await createLesson(
      {
        params: { id: "course-1", sectionId: "section-1" },
        body: {
          title: "Interactive Practice",
          type: "INTERACTIVE",
          durationSec: 600,
          isPublished: true,
          interactiveConfig: {
            introduction: "Follow each step",
            steps: [
              {
                id: "step-1",
                title: "Review the prompt",
                description: "Read the scenario carefully",
                order: 0,
              },
            ],
          },
        },
        user: { _id: "owner-1", role: "INSTRUCTOR" },
      },
      res
    );

    expect(mocked.Lesson).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INTERACTIVE",
        interactiveConfig: expect.objectContaining({
          steps: expect.arrayContaining([
            expect.objectContaining({ title: "Review the prompt" }),
          ]),
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("allows an admin to delete a lesson and cleanup dependent records", async () => {
    const lesson = {
      _id: "lesson-1",
      courseId: { ownerId: { toString: () => "owner-1" } },
    };
    mocked.Lesson.findOne.mockReturnValue(createPopulatePromise(lesson));
    mocked.CourseMaterial.find.mockResolvedValue([
      { _id: "material-1", file: { publicId: "course-materials/deck" } },
    ]);
    mocked.Task.find.mockReturnValue({
      distinct: vi.fn().mockResolvedValue(["task-1"]),
    });
    mocked.Section.find.mockResolvedValue([{ _id: "section-1" }]);
    mocked.Lesson.find.mockResolvedValue([{ durationSec: 600 }]);
    mocked.LessonProgress.deleteMany.mockResolvedValue({});
    mocked.LessonNote.deleteMany.mockResolvedValue({});
    mocked.LessonDiscussion.deleteMany.mockResolvedValue({});
    mocked.InteractiveStepSubmission.deleteMany.mockResolvedValue({});
    mocked.TaskSubmission.deleteMany.mockResolvedValue({});
    mocked.Task.deleteMany.mockResolvedValue({});
    mocked.CourseMaterial.deleteMany.mockResolvedValue({});
    mocked.Lesson.deleteOne.mockResolvedValue({});
    mocked.Course.findByIdAndUpdate.mockResolvedValue({});
    const res = createRes();

    await deleteLesson(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        user: { _id: "admin-1", role: "ADMIN" },
      },
      res
    );

    expect(mocked.Lesson.findOne).toHaveBeenCalledWith({
      _id: "lesson-1",
      courseId: "course-1",
    });
    expect(mocked.CourseMaterial.deleteMany).toHaveBeenCalledWith({
      course: "course-1",
      lesson: "lesson-1",
    });
    expect(mocked.Lesson.deleteOne).toHaveBeenCalledWith({ _id: "lesson-1" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        message: "Lesson deleted successfully",
      })
    );
  });

  it("allows a course-owner instructor to delete a lesson", async () => {
    mocked.Lesson.findOne.mockReturnValue(
      createPopulatePromise({
        _id: "lesson-1",
        courseId: { ownerId: { toString: () => "owner-1" } },
      })
    );
    mocked.CourseMaterial.find.mockResolvedValue([]);
    mocked.Task.find.mockReturnValue({
      distinct: vi.fn().mockResolvedValue([]),
    });
    mocked.Section.find.mockResolvedValue([]);
    mocked.LessonProgress.deleteMany.mockResolvedValue({});
    mocked.LessonNote.deleteMany.mockResolvedValue({});
    mocked.LessonDiscussion.deleteMany.mockResolvedValue({});
    mocked.InteractiveStepSubmission.deleteMany.mockResolvedValue({});
    mocked.TaskSubmission.deleteMany.mockResolvedValue({});
    mocked.Task.deleteMany.mockResolvedValue({});
    mocked.CourseMaterial.deleteMany.mockResolvedValue({});
    mocked.Lesson.deleteOne.mockResolvedValue({});
    mocked.Course.findByIdAndUpdate.mockResolvedValue({});
    const res = createRes();

    await deleteLesson(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        user: { _id: "owner-1", role: "INSTRUCTOR" },
      },
      res
    );

    expect(mocked.Lesson.deleteOne).toHaveBeenCalledWith({ _id: "lesson-1" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });

  it("rejects a non-owner instructor deleting another course lesson", async () => {
    mocked.Lesson.findOne.mockReturnValue(
      createPopulatePromise({
        _id: "lesson-1",
        courseId: { ownerId: { toString: () => "owner-1" } },
      })
    );
    const res = createRes();

    await deleteLesson(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        user: { _id: "other-1", role: "INSTRUCTOR" },
      },
      res
    );

    expect(mocked.Lesson.deleteOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates persistent lesson notes scoped to the authenticated user", async () => {
    mocked.Lesson.findOne.mockResolvedValue({ _id: "lesson-1" });
    const res = createRes();

    await createNote(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        body: { content: "My lesson note" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mocked.Lesson.findOne).toHaveBeenCalledWith({
      _id: "lesson-1",
      courseId: "course-1",
    });
    expect(mocked.LessonNote).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "course-1",
        lessonId: "lesson-1",
        userId: "user-1",
        content: "My lesson note",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: expect.objectContaining({
            id: "note-1",
            content: "My lesson note",
          }),
        }),
      })
    );
  });

  it("lists only the authenticated user's notes for a lesson", async () => {
    mocked.Lesson.findOne.mockResolvedValue({ _id: "lesson-1" });
    const chain = {
      sort: vi.fn().mockResolvedValue([
        {
          _id: "note-1",
          courseId: "course-1",
          lessonId: "lesson-1",
          userId: "user-1",
          content: "Saved note",
          createdAt: new Date("2026-07-14T10:00:00.000Z"),
          updatedAt: new Date("2026-07-14T10:00:00.000Z"),
        },
      ]),
    };
    mocked.LessonNote.find.mockReturnValue(chain);
    const res = createRes();

    await getLessonNotes(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mocked.LessonNote.find).toHaveBeenCalledWith({
      courseId: "course-1",
      lessonId: "lesson-1",
      userId: "user-1",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: [expect.objectContaining({ id: "note-1" })],
        }),
      })
    );
  });

  it("updates only notes owned by the authenticated user", async () => {
    mocked.Lesson.findOne.mockResolvedValue({ _id: "lesson-1" });
    mocked.LessonNote.findOneAndUpdate.mockResolvedValue({
      _id: "note-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      userId: "user-1",
      content: "Updated note",
      createdAt: new Date("2026-07-14T10:00:00.000Z"),
      updatedAt: new Date("2026-07-14T10:01:00.000Z"),
    });
    const res = createRes();

    await updateNote(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", id: "note-1" },
        body: { content: "Updated note" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mocked.LessonNote.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: "note-1",
        courseId: "course-1",
        lessonId: "lesson-1",
        userId: "user-1",
      },
      { content: "Updated note" },
      { new: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: expect.objectContaining({ content: "Updated note" }),
        }),
      })
    );
  });

  it("deletes only notes owned by the authenticated user", async () => {
    mocked.Lesson.findOne.mockResolvedValue({ _id: "lesson-1" });
    mocked.LessonNote.findOneAndDelete.mockResolvedValue({ _id: "note-1" });
    const res = createRes();

    await deleteNote(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", id: "note-1" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mocked.LessonNote.findOneAndDelete).toHaveBeenCalledWith({
      _id: "note-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      userId: "user-1",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: null,
      })
    );
  });

  it("rejects notes when the lesson is not in the requested course", async () => {
    mocked.Lesson.findOne.mockResolvedValue(null);
    const res = createRes();

    await createNote(
      {
        params: { courseId: "course-1", lessonId: "missing-lesson" },
        body: { content: "My note" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mocked.LessonNote).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("lists lesson discussions for enrolled learners", async () => {
    mocked.LessonDiscussion.find.mockReturnValue(
      createDiscussionFindChain([
        {
          _id: "discussion-1",
          courseId: "course-1",
          lessonId: "lesson-1",
          title: "Question",
          content: "How should we apply this?",
          authorId: { _id: "user-1", name: "Ada", email: "ada@example.com", role: "PARTICIPANT" },
          replies: [],
          createdAt: new Date("2026-07-14T10:00:00.000Z"),
          updatedAt: new Date("2026-07-14T10:00:00.000Z"),
        },
      ])
    );
    const res = createRes();

    await getDiscussions(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.LessonDiscussion.find).toHaveBeenCalledWith({
      courseId: "course-1",
      lessonId: "lesson-1",
      deletedAt: null,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussions: [
            expect.objectContaining({
              id: "discussion-1",
              author: expect.objectContaining({ name: "Ada" }),
            }),
          ],
        }),
      })
    );
  });

  it("creates persistent lesson discussions when access is allowed", async () => {
    const discussion = new mocked.LessonDiscussion({
      courseId: "course-1",
      lessonId: "lesson-1",
      title: "Question",
      content: "How should we apply this?",
      authorId: { _id: "user-1", name: "Ada", role: "PARTICIPANT" },
    });
    mocked.LessonDiscussion.create.mockResolvedValue(discussion);
    const res = createRes();

    await createDiscussion(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        body: { title: "Question", content: "How should we apply this?" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.LessonDiscussion.create).toHaveBeenCalledWith({
      courseId: "course-1",
      lessonId: "lesson-1",
      title: "Question",
      content: "How should we apply this?",
      authorId: "user-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("forbids discussions for users without course access", async () => {
    canAccessLessonProgress.mockResolvedValueOnce(false);
    const res = createRes();

    await createDiscussion(
      {
        params: { courseId: "course-1", lessonId: "lesson-1" },
        body: { title: "Question", content: "How should we apply this?" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.LessonDiscussion.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("prevents participants from deleting another learner's discussion", async () => {
    mocked.LessonDiscussion.findOne.mockResolvedValue({
      _id: "discussion-1",
      authorId: { toString: () => "user-2" },
      deletedAt: null,
      save: vi.fn(),
    });
    const res = createRes();

    await deleteDiscussion(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", id: "discussion-1" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("adds replies to an existing lesson discussion", async () => {
    const discussion = {
      _id: "discussion-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      title: "Question",
      content: "How should we apply this?",
      authorId: { _id: "user-1", name: "Ada" },
      replies: [],
      save: vi.fn().mockResolvedValue(null),
      populate: vi.fn().mockResolvedValue(null),
      createdAt: new Date("2026-07-14T10:00:00.000Z"),
      updatedAt: new Date("2026-07-14T10:00:00.000Z"),
    };
    discussion.replies.push = vi.fn((reply) => {
      Array.prototype.push.call(discussion.replies, {
        _id: "reply-1",
        ...reply,
        authorId: { _id: "user-2", name: "Ben" },
        createdAt: new Date("2026-07-14T10:05:00.000Z"),
        updatedAt: new Date("2026-07-14T10:05:00.000Z"),
      });
      return discussion.replies.length;
    });
    mocked.LessonDiscussion.findOne.mockResolvedValue(discussion);
    const res = createRes();

    await addReply(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", id: "discussion-1" },
        body: { content: "This helped me too." },
        user: { _id: "user-2", role: "PARTICIPANT" },
      },
      res
    );

    expect(discussion.replies.push).toHaveBeenCalledWith({
      content: "This helped me too.",
      authorId: "user-2",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("submits a reflect step and records completed step progress", async () => {
    mocked.Lesson.findOne.mockResolvedValue({
      _id: "lesson-1",
      type: "INTERACTIVE",
      interactiveConfig: {
        steps: [{ id: "step-1", title: "Reflect", step_type: "reflect", order: 0 }],
      },
    });
    mocked.InteractiveStepSubmission.findOneAndUpdate.mockResolvedValue({
      _id: "submission-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      stepId: "step-1",
      userId: "user-1",
      stepType: "reflect",
      responseText: "My reflection",
      status: "completed",
      visibility: "private",
    });
    mocked.LessonProgress.findOneAndUpdate.mockResolvedValue({
      completedStepIds: ["step-1"],
    });
    const res = createRes();

    await submitInteractiveStep(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", stepId: "step-1" },
        body: { responseText: "My reflection" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.InteractiveStepSubmission.findOneAndUpdate).toHaveBeenCalledWith(
      { courseId: "course-1", lessonId: "lesson-1", stepId: "step-1", userId: "user-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          stepType: "reflect",
          responseText: "My reflection",
          status: "completed",
        }),
      }),
      { new: true, upsert: true, runValidators: true }
    );
    expect(mocked.LessonProgress.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "user-1", lessonId: "lesson-1" },
      expect.objectContaining({ $addToSet: { completedStepIds: "step-1" } }),
      { new: true, upsert: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completed: true }),
      })
    );
  });

  it("does not complete a quiz step until the correct answer is submitted", async () => {
    mocked.Lesson.findOne.mockResolvedValue({
      _id: "lesson-1",
      type: "INTERACTIVE",
      interactiveConfig: {
        steps: [
          {
            id: "quiz-1",
            title: "Quiz",
            step_type: "quiz",
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
            correct_answer: "b",
            order: 0,
          },
        ],
      },
    });
    mocked.InteractiveStepSubmission.findOneAndUpdate.mockResolvedValue({
      _id: "submission-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      stepId: "quiz-1",
      userId: "user-1",
      stepType: "quiz",
      selectedAnswer: "a",
      isCorrect: false,
      status: "submitted",
      visibility: "private",
    });
    const res = createRes();

    await submitInteractiveStep(
      {
        params: { courseId: "course-1", lessonId: "lesson-1", stepId: "quiz-1" },
        body: { selectedAnswer: "a" },
        user: { _id: "user-1", role: "PARTICIPANT" },
      },
      res
    );

    expect(mocked.LessonProgress.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completed: false }),
      })
    );
  });
});
