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

// GET /programs - Get all programs
export const getAllPrograms = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, isPublic, ownerId, coordinatorId, search, enrollmentOpen } =
      req.query;

    // Build query
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by public/private
    if (isPublic !== undefined) {
      query.isPublic = isPublic === "true";
    }

    // Filter by owner
    if (ownerId) {
      query.ownerId = ownerId;
    }

    // Filter by coordinator
    if (coordinatorId) {
      query.coordinatorId = coordinatorId;
    }

    // Filter by enrollment status
    if (enrollmentOpen !== undefined) {
      const now = new Date();
      if (enrollmentOpen === "true") {
        query.enrollmentOpen = true;
        query.enrollmentStartDate = { $lte: now };
        query.enrollmentEndDate = { $gte: now };
        query.currentParticipants = { $lt: "$maxParticipants" };
      } else {
        query.$or = [
          { enrollmentOpen: false },
          { enrollmentStartDate: { $gt: now } },
          { enrollmentEndDate: { $lt: now } },
          { currentParticipants: { $gte: "$maxParticipants" } },
        ];
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // For non-admin users, only show public programs or programs they're involved in
    if (req.user?.role !== "ADMIN") {
      query.$or = [
        { isPublic: true },
        { ownerId: req.user?._id },
        { coordinatorId: req.user?._id },
      ];
    }

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

    const result = createPaginationResult(programs, total, page, limit);

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

    // Check access permissions
    if (
      req.user?.role !== "ADMIN" &&
      program.ownerId._id.toString() !== req.user?._id.toString() &&
      program.coordinatorId._id.toString() !== req.user?._id.toString() &&
      !program.isPublic
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    logger.info("Get program by ID", { programId: id, userId: req.user?._id });

    return successResponse(res, program, "Program retrieved successfully");
  } catch (error) {
    logger.error("Get program by ID error:", error);
    return errorResponse(res, error);
  }
};

// POST /programs - Create new program
export const createProgram = async (req, res) => {
  try {
    const programData = {
      ...req.body,
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

    return successResponse(res, program, "Program created successfully", 201);
  } catch (error) {
    logger.error("Create program error:", error);
    return errorResponse(res, error);
  }
};

// PUT /programs/:id - Update program
export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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

    return successResponse(res, program, "Program updated successfully");
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
    if (
      req.user?.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user?._id.toString() &&
      program.coordinatorId.toString() !== req.user?._id.toString() &&
      !program.isPublic
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    const { Course } = await import("../../courses/models/Course.js");

    const query = { programId: id };

    // For non-admin users, only show published courses
    if (
      req.user?.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user?._id.toString()
    ) {
      query.status = "PUBLISHED";
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(courses, total, page, limit);

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
    if (
      req.user?.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user?._id.toString() &&
      program.coordinatorId.toString() !== req.user?._id.toString() &&
      !program.isPublic
    ) {
      return forbiddenResponse(res, "Access denied to this program");
    }

    const { Cohort } = await import("../../cohorts/models/Cohort.js");

    const query = { programId: id };

    // For non-admin users, only show active cohorts
    if (
      req.user?.role !== "ADMIN" &&
      program.ownerId.toString() !== req.user?._id.toString()
    ) {
      query.status = "ACTIVE";
    }

    const total = await Cohort.countDocuments(query);
    const cohorts = await Cohort.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(cohorts, total, page, limit);

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
    const { Enrollment } = await import(
      "../../enrollments/models/Enrollment.js"
    );

    // Get course statistics
    const courseStats = await Course.aggregate([
      { $match: { programId: program._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get cohort statistics
    const cohortStats = await Cohort.aggregate([
      { $match: { programId: program._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      { $match: { "course.programId": program._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statistics = {
      program: {
        name: program.name,
        code: program.code,
        status: program.status,
        currentParticipants: program.currentParticipants,
        maxParticipants: program.maxParticipants,
        capacityPercentage: program.capacityPercentage,
        enrollmentStatus: program.enrollmentStatus,
        progress: program.progress,
      },
      courses: courseStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      cohorts: cohortStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      enrollments: enrollmentStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
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
    const { UserProgram } = await import("../models/UserProgram.js");
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

    // Add participant to program
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

    // Create user program enrollment
    const userProgram = new UserProgram({
      userId: req.user._id,
      programId: id,
      enrolledAt: new Date(),
      status: "ACTIVE",
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
        program: program,
        enrollment: userProgram,
      },
      "Successfully enrolled in program"
    );
  } catch (error) {
    logger.error("Enroll in program error:", error);
    return errorResponse(res, error);
  }
};
