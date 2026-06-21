import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  Program: {
    findById: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
  UserProgram: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  Course: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
  Cohort: {
    countDocuments: vi.fn(),
  },
}));

vi.mock("../models/Program.js", () => ({
  default: mocked.Program,
}));

vi.mock("../models/UserProgram.js", () => ({
  default: mocked.UserProgram,
}));

vi.mock("../../courses/models/Course.js", () => ({
  Course: mocked.Course,
}));

vi.mock("../../cohorts/models/Cohort.js", () => ({
  Cohort: mocked.Cohort,
}));

const {
  getProgramById,
  getAllPrograms,
  getMyProgramEnrollments,
  getProgramStatistics,
  getProgramCourses,
} = await import("./programController.js");

const createPopulatePromise = (value) => {
  const promise = Promise.resolve(value);
  promise.populate = vi.fn(() => promise);
  return promise;
};

const createFindChain = (value) => {
  const chain = {
    populate: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue(value),
  };
  return chain;
};

const createRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("programController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for anonymous access to a private program", async () => {
    mocked.Program.findById.mockReturnValue(
      createPopulatePromise({
        _id: "program-1",
        id: "program-1",
        isPublic: false,
        ownerId: { _id: "owner-1" },
        coordinatorId: { _id: "coordinator-1" },
        toObject() {
          return this;
        },
      })
    );

    const res = createRes();

    await getProgramById({ params: { id: "program-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          message: "Access denied to this program",
        }),
      })
    );
  });

  it("builds a composed filter query for program listing", async () => {
    mocked.Program.countDocuments.mockResolvedValue(0);
    mocked.Program.find.mockReturnValue(createFindChain([]));

    const res = createRes();

    await getAllPrograms(
      {
        query: {
          search: "AI",
          status: "PAUSED",
          enrollmentOpen: "true",
        },
      },
      res
    );

    expect(mocked.Program.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          { status: { $in: ["PAUSED", "INACTIVE"] } },
          { isPublic: true },
          { status: "ACTIVE" },
          expect.objectContaining({
            $or: expect.arrayContaining([
              { name: { $regex: "AI", $options: "i" } },
            ]),
          }),
          expect.objectContaining({
            enrollmentOpen: true,
            $expr: { $lt: ["$currentParticipants", "$maxParticipants"] },
          }),
        ]),
      })
    );
  });

  it("returns the current user's enrolled programs in frontend-compatible shape", async () => {
    const chain = {
      populate: vi.fn(() => chain),
      sort: vi.fn().mockResolvedValue([
        {
          programId: {
            _id: "program-1",
            id: "program-1",
            name: "AI Masterclass",
            status: "ACTIVE",
            currentParticipants: 12,
            location: { type: "ONLINE" },
            toObject() {
              return this;
            },
          },
        },
      ]),
    };
    mocked.UserProgram.find.mockReturnValue(chain);

    const res = createRes();

    await getMyProgramEnrollments({ user: { _id: "user-1" } }, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          data: [
            expect.objectContaining({
              id: "program-1",
              enrollmentCount: 12,
            }),
          ],
        }),
      })
    );
  });

  it("returns frontend-ready program statistics fields", async () => {
    mocked.Program.findById.mockResolvedValue({
      _id: "program-1",
      ownerId: { toString: () => "owner-1" },
      coordinatorId: { toString: () => "coordinator-1" },
    });
    mocked.Course.countDocuments.mockResolvedValue(3);
    mocked.Cohort.countDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    mocked.UserProgram.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3);
    mocked.UserProgram.aggregate
      .mockResolvedValueOnce([{ averageProgress: 64 }])
      .mockResolvedValueOnce([{ _id: "2026-04-10", enrollments: 4 }])
      .mockResolvedValueOnce([{ _id: "2026-04-11", completions: 2 }]);

    const res = createRes();

    await getProgramStatistics(
      {
        params: { id: "program-1" },
        user: {
          _id: "owner-1",
          role: "INSTRUCTOR",
        },
      },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          totalEnrollments: 10,
          activeEnrollments: 7,
          completedEnrollments: 3,
          completionRate: 30,
          totalCohorts: 2,
          activeCohorts: 1,
          totalCourses: 3,
          averageProgress: 64,
          enrollmentTrends: [{ date: "2026-04-10", enrollments: 4 }],
          completionTrends: [{ date: "2026-04-11", completions: 2 }],
        }),
      })
    );
  });

  it("includes cohort-aware course metadata for program course listings", async () => {
    mocked.Program.findById.mockResolvedValue({
      _id: "program-1",
      ownerId: { toString: () => "owner-1" },
      coordinatorId: { toString: () => "coordinator-1" },
      isPublic: true,
    });
    mocked.Course.find.mockReturnValue(
      createFindChain([
        {
          _id: "course-1",
          id: "course-1",
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
        },
      ])
    );

    const res = createRes();

    await getProgramCourses(
      {
        params: { id: "program-1" },
        user: { _id: "owner-1", role: "INSTRUCTOR" },
        query: {},
      },
      res
    );

    expect(mocked.Course.find).toHaveBeenCalledWith({ programId: "program-1" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          data: [
            expect.objectContaining({
              id: "course-1",
              cohortCount: 1,
              cohorts: [expect.objectContaining({ name: "Cohort 1" })],
            }),
          ],
        }),
      })
    );
  });
});
