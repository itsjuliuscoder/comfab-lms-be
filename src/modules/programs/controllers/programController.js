import Program from "../models/Program.js";
import { logger } from "../../../utils/logger.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
} from "../../../utils/response.js";
import {
  getPaginationParams,
  createPaginationResult,
} from "../../../utils/pagination.js";

const PROGRAM_STATUS_OUT = {
  INACTIVE: "PAUSED",
  ARCHIVED: "CANCELLED",
};

const LOCATION_TYPE_OUT = {
  ONSITE: "IN_PERSON",
};

const LOCATION_TYPE_IN = {
  IN_PERSON: "IN_PERSON",
  ONLINE: "ONLINE",
  HYBRID: "HYBRID",
};

const PROGRAM_STATUS_IN = {
  DRAFT: ["DRAFT"],
  ACTIVE: ["ACTIVE"],
  PAUSED: ["PAUSED", "INACTIVE"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "ARCHIVED"],
};

const normalizeProgramStatus = (status) => PROGRAM_STATUS_OUT[status] || status;
const normalizeLocationType = (type) => LOCATION_TYPE_OUT[type] || type;

const toFrontendProgram = (programDoc) => {
  if (!programDoc) return null;

  const program = typeof programDoc.toObject === "function"
    ? programDoc.toObject({ virtuals: true })
    : { ...programDoc };

  return {
    ...program,
    id: program.id || program._id?.toString(),
    status: normalizeProgramStatus(program.status),
    enrollmentCount: program.enrollmentCount ?? program.currentParticipants ?? 0,
    completionRate: program.completionRate ?? 0,
    averageScore: program.averageScore ?? 0,
    location: program.location
      ? {
          ...program.location,
          type: normalizeLocationType(program.location.type),
        }
      : program.location,
  };
};

const toFrontendCohort = (cohortDoc) => {
  if (!cohortDoc) return null;

  const cohort = typeof cohortDoc.toObject === "function"
    ? cohortDoc.toObject({ virtuals: true })
    : { ...cohortDoc };

  return {
    ...cohort,
    id: cohort.id || cohort._id?.toString(),
    status: cohort.status === "INACTIVE" ? "CANCELLED" : cohort.status,
    currentParticipants:
      cohort.currentParticipants ??
      cohort.activeParticipants ??
      cohort.participantCount ??
      0,
    coordinator: cohort.coordinator || cohort.createdBy || null,
    participants: cohort.participants || [],
  };
};

const buildProgramStatusCondition = (status) => {
  const values = PROGRAM_STATUS_IN[status] || [status];
  return values.length === 1 ? values[0] : { $in: values };
};

const applyProgramInputNormalization = (payload = {}) => {
  if (!payload.location?.type && !payload.status) {
    return payload;
  }

  return {
    ...payload,
    ...(payload.status ? { status: normalizeProgramStatus(payload.status) } : {}),
    ...(payload.location
      ? {
          location: {
            ...payload.location,
            ...(payload.location.type
              ? { type: LOCATION_TYPE_IN[payload.location.type] || payload.location.type }
              : {}),
          },
        }
      : {}),
  };
};

// GET /programs - Get all programs
export const getAllPrograms = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, isPublic, ownerId, coordinatorId, search, enrollmentOpen } =
      req.query;

    const conditions = [];

    if (status) {
      conditions.push({ status: buildProgramStatusCondition(status) });
    }

    if (isPublic !== undefined) {
      conditions.push({ isPublic: isPublic === "true" });
    }

    if (ownerId) {
      conditions.push({ ownerId });
    }

    if (coordinatorId) {
      conditions.push({ coordinatorId });
    }

    if (enrollmentOpen !== undefined) {
      const now = new Date();
      const openCondition = {
        enrollmentOpen: true,
        enrollmentStartDate: { $lte: now },
        enrollmentEndDate: { $gte: now },
        $expr: { $lt: ["$currentParticipants", "$maxParticipants"] },
      };

      if (enrollmentOpen === "true") {
        conditions.push(openCondition);
      } else {
        conditions.push({
          $or: [
            { enrollmentOpen: false },
            { enrollmentStartDate: { $gt: now } },
            { enrollmentEndDate: { $lt: now } },
            { $expr: { $gte: ["$currentParticipants", "$maxParticipants"] } },
          ],
        });
      }
    }

    if (search) {
      conditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ],
      });
    }

    if (!req.user || req.user.role === "PARTICIPANT") {
      conditions.push({ isPublic: true });
      conditions.push({ status: buildProgramStatusCondition("ACTIVE") });
    } else if (req.user.role !== "ADMIN") {
      const visibilityConditions = [{ isPublic: true }];

      if (req.user?._id) {
        visibilityConditions.push({ ownerId: req.user._id });
        visibilityConditions.push({ coordinatorId: req.user._id });
      }

      conditions.push({ $or: visibilityConditions });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    // Get total count
    const total = await Program.countDocuments(query);

    // Get programs with pagination
    const programs = await Program.find(query)
      .populate("ownerId", "name email")
      .populate("coordinatorId", "name email")
      .populate("courses", "title status")
      .populate("cohorts", "name status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const serializedPrograms = programs.map(toFrontendProgram);
    const result = createPaginationResult(serializedPrograms, total, page, limit);

    logger.info("Get all programs", {
      total,
      page,
      limit,
      filters: { status, isPublic, search },
      userId: req.user?._id,
    });

    return successResponse(res, result, "Programs retrieved successfully");
  } catch (error) {
    logger.error("Get all programs error:", error);
    return errorResponse(res, error);
  }
};

// GET /programs/:id - Get program by ID
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id)
      .populate("ownerId", "name email")
      .populate("coordinatorId", "name email")
      .populate({
        path: "courses",
        select: "title description status startDate endDate",
        populate: {
          path: "ownerId",
          select: "name email",
        },
      })
      .populate({
        path: "cohorts",
        select: "name description status startDate endDate maxParticipants",
        populate: {
          path: "createdBy",
          select: "name email",
        },
      });

    if (!program) {
      return notFoundResponse(res, "Program");
    }

    const userId = req.user?._id?.toString();
    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = userId && program.ownerId?._id?.toString() === userId;
    const isCoordinator =
      userId && program.coordinatorId?._id?.toString() === userId;

    if (
      (!program.isPublic || normalizeProgramStatus(program.status) !== "ACTIVE") &&
      !isAdmin &&
      !isOwner &&
      !isCoordinator
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    logger.info("Get program by ID", { programId: id, userId: req.user?._id });

    return successResponse(
      res,
      toFrontendProgram(program),
      "Program retrieved successfully"
    );
  } catch (error) {
    logger.error("Get program by ID error:", error);
    return errorResponse(res, error);
  }
};

// POST /programs - Create new program
export const createProgram = async (req, res) => {
  try {
    const programData = {
      ...applyProgramInputNormalization(req.body),
      ownerId: req.user._id,
    };

    // Check if program code already exists
    const existingProgram = await Program.findByCode(programData.code);
    if (existingProgram) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "PROGRAM_CODE_EXISTS",
          message: "Program code already exists",
        },
      });
    }

    const program = new Program(programData);
    await program.save();

    // Populate the created program
    await program.populate([
      { path: "ownerId", select: "name email" },
      { path: "coordinatorId", select: "name email" },
    ]);

    logger.info("Program created", {
      programId: program._id,
      name: program.name,
      code: program.code,
      createdBy: req.user._id,
    });

    return successResponse(
      res,
      toFrontendProgram(program),
      "Program created successfully",
      201
    );
  } catch (error) {
    logger.error("Create program error:", error);
    return errorResponse(res, error);
  }
};

// PUT /programs/:id - Update program
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = applyProgramInputNormalization(req.body);

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check permissions
    if (
      req.user.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(
        res,
        "Only program owner or admin can update this program"
      );
    }

    // Check if new code conflicts with existing programs
    if (updateData.code && updateData.code !== program.code) {
      const existingProgram = await Program.findByCode(updateData.code);
      if (existingProgram) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "PROGRAM_CODE_EXISTS",
            message: "Program code already exists",
          },
        });
      }
    }

    // Update program
    Object.assign(program, updateData);
    await program.save();

    // Populate the updated program
    await program.populate([
      { path: "ownerId", select: "name email" },
      { path: "coordinatorId", select: "name email" },
    ]);

    logger.info("Program updated", {
      programId: id,
      updatedBy: req.user._id,
      changes: Object.keys(updateData),
    });

    return successResponse(
      res,
      toFrontendProgram(program),
      "Program updated successfully"
    );
  } catch (error) {
    logger.error("Update program error:", error);
    return errorResponse(res, error);
  }
};

// DELETE /programs/:id - Delete program
export const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check permissions
    if (
      req.user.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(
        res,
        "Only program owner or admin can delete this program"
      );
    }

    // Check if program has active courses or cohorts
    const { Course } = await import("../../courses/models/Course.js");
    const { Cohort } = await import("../../cohorts/models/Cohort.js");

    const activeCourses = await Course.countDocuments({
      programId: id,
      status: { $in: ["ACTIVE", "PUBLISHED"] },
    });

    const activeCohorts = await Cohort.countDocuments({
      programId: id,
      status: "ACTIVE",
    });

    if (activeCourses > 0 || activeCohorts > 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "PROGRAM_HAS_ACTIVE_CONTENT",
          message: "Cannot delete program with active courses or cohorts",
        },
      });
    }

    await Program.findByIdAndDelete(id);

    logger.info("Program deleted", {
      programId: id,
      deletedBy: req.user._id,
      programName: program.name,
    });

    return successResponse(res, null, "Program deleted successfully");
  } catch (error) {
    logger.error("Delete program error:", error);
    return errorResponse(res, error);
  }
};

// GET /programs/:id/courses - Get program courses
export const getProgramCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check access permissions
    const userId = req.user?._id?.toString();
    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = userId && program.ownerId.toString() === userId;
    const isCoordinator = userId && program.coordinatorId.toString() === userId;
    const includeCohorts = Boolean(isAdmin || isOwner || isCoordinator);

    if (
      !isAdmin &&
      !isOwner &&
      !isCoordinator &&
      !program.isPublic
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    const { Course } = await import("../../courses/models/Course.js");

    const query = { programId: id };

    // For non-admin users, only show published courses
    if (
      !isAdmin &&
      !isOwner
    ) {
      query.status = "PUBLISHED";
      query.isPublic = true;
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (includeCohorts) {
      await Promise.all(
        courses.map((course) =>
          course.populate?.("cohortIds", "name status programId")
        )
      );
    }

    const { toFrontendCourse } = await import("../../courses/controllers/courseController.js");
    const result = createPaginationResult(
      courses.map((course) =>
        toFrontendCourse(course, { includeCohorts })
      ),
      total,
      page,
      limit
    );

    logger.info("Get program courses", {
      programId: id,
      total,
      userId: req.user?._id,
    });

    return successResponse(
      res,
      result,
      "Program courses retrieved successfully"
    );
  } catch (error) {
    logger.error("Get program courses error:", error);
    return errorResponse(res, error);
  }
};

// GET /programs/:id/cohorts - Get program cohorts
export const getProgramCohorts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check access permissions
    const userId = req.user?._id?.toString();
    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = userId && program.ownerId.toString() === userId;
    const isCoordinator = userId && program.coordinatorId.toString() === userId;

    if (
      !isAdmin &&
      !isOwner &&
      !isCoordinator &&
      !program.isPublic
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    const { Cohort } = await import("../../cohorts/models/Cohort.js");

    const query = { programId: id };

    // For non-admin users, only show active cohorts
    if (
      !isAdmin &&
      !isOwner
    ) {
      query.status = "ACTIVE";
    }

    const total = await Cohort.countDocuments(query);
    const cohorts = await Cohort.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(
      cohorts.map(toFrontendCohort),
      total,
      page,
      limit
    );

    logger.info("Get program cohorts", {
      programId: id,
      total,
      userId: req.user?._id,
    });

    return successResponse(
      res,
      result,
      "Program cohorts retrieved successfully"
    );
  } catch (error) {
    logger.error("Get program cohorts error:", error);
    return errorResponse(res, error);
  }
};

// GET /programs/:id/statistics - Get program statistics
export const getProgramStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check permissions
    if (
      req.user.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user._id.toString() &&
      program.coordinatorId.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    const { Course } = await import("../../courses/models/Course.js");
    const { Cohort } = await import("../../cohorts/models/Cohort.js");
    const UserProgram = (await import("../models/UserProgram.js")).default;

    const [
      totalCourses,
      totalCohorts,
      activeCohorts,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      completionAverage,
      enrollmentTrends,
      completionTrends,
    ] = await Promise.all([
      Course.countDocuments({ programId: program._id }),
      Cohort.countDocuments({ programId: program._id }),
      Cohort.countDocuments({
        programId: program._id,
        status: { $in: ["ACTIVE"] },
      }),
      UserProgram.countDocuments({ programId: program._id }),
      UserProgram.countDocuments({ programId: program._id, status: "ACTIVE" }),
      UserProgram.countDocuments({
        programId: program._id,
        status: "COMPLETED",
      }),
      UserProgram.aggregate([
        { $match: { programId: program._id } },
        {
          $group: {
            _id: null,
            averageProgress: { $avg: "$completionPercentage" },
          },
        },
      ]),
      UserProgram.aggregate([
        { $match: { programId: program._id } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" },
            },
            enrollments: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      UserProgram.aggregate([
        {
          $match: {
            programId: program._id,
            completedAt: { $ne: null },
            status: "COMPLETED",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
            },
            completions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const averageProgress = Math.round(
      completionAverage[0]?.averageProgress || 0
    );
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    const statistics = {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      completionRate,
      averageScore: 0,
      totalCohorts,
      activeCohorts,
      totalCourses,
      averageProgress,
      enrollmentTrends: enrollmentTrends.map((item) => ({
        date: item._id,
        enrollments: item.enrollments,
      })),
      completionTrends: completionTrends.map((item) => ({
        date: item._id,
        completions: item.completions,
      })),
    };

    logger.info("Get program statistics", {
      programId: id,
      userId: req.user._id,
    });

    return successResponse(
      res,
      statistics,
      "Program statistics retrieved successfully"
    );
  } catch (error) {
    logger.error("Get program statistics error:", error);
    return errorResponse(res, error);
  }
};

// POST /programs/:id/enroll - Enroll in program
export const enrollInProgram = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findById(id);
    if (!program) {
      return notFoundResponse(res, "Program");
    }

    // Check if enrollment is open
    if (!program.canEnroll()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "ENROLLMENT_CLOSED",
          message: "Program enrollment is not open",
        },
      });
    }

    // Check if user is already enrolled
    const UserProgram = (await import("../models/UserProgram.js")).default;
    const existingEnrollment = await UserProgram.findOne({
      userId: req.user._id,
      programId: id,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "ALREADY_ENROLLED",
          message: "User is already enrolled in this program",
        },
      });
    }

    const requiresApproval = Boolean(program.settings?.requireApproval);
    if (!program.settings?.allowSelfEnrollment && !requiresApproval) {
      return forbiddenResponse(
        res,
        "This program does not accept self-enrollment"
      );
    }

    if (!requiresApproval) {
      const added = program.addParticipant();
      if (!added) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "PROGRAM_FULL",
            message: "Program has reached maximum capacity",
          },
        });
      }
      await program.save();
    }

    // Create user program enrollment
    const userProgram = new UserProgram({
      userId: req.user._id,
      programId: id,
      enrolledAt: new Date(),
      status: requiresApproval ? "PENDING" : "ACTIVE",
    });

    await userProgram.save();

    logger.info("User enrolled in program", {
      programId: id,
      userId: req.user._id,
      programName: program.name,
    });

    return successResponse(
      res,
      {
        program: toFrontendProgram(program),
        enrollment: userProgram,
      },
      requiresApproval
        ? "Enrollment request submitted for review"
        : "Successfully enrolled in program",
      requiresApproval ? 202 : 200
    );
  } catch (error) {
    logger.error("Enroll in program error:", error);
    return errorResponse(res, error);
  }
};

// GET /programs/my-enrollments - Get current user's enrolled programs
export const getMyProgramEnrollments = async (req, res) => {
  try {
    const UserProgram = (await import("../models/UserProgram.js")).default;

    const enrollments = await UserProgram.find({ userId: req.user._id })
      .populate("programId")
      .sort({ enrolledAt: -1 });

    const programs = enrollments
      .filter((enrollment) => enrollment.programId)
      .map((enrollment) => ({
        ...toFrontendProgram(enrollment.programId),
        userEnrollmentStatus: enrollment.status,
      }));

    return successResponse(
      res,
      { data: programs, programs },
      "Program enrollments retrieved successfully"
    );
  } catch (error) {
    logger.error("Get my program enrollments error:", error);
    return errorResponse(res, error);
  }
};
