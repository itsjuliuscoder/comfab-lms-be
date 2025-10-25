import { Cohort } from "../models/Cohort.js";
import { UserCohort } from "../models/UserCohort.js";
import { User } from "../../users/models/User.js";
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
import { logger } from "../../../utils/logger.js";

// GET /cohorts - Get all cohorts
export const getAllCohorts = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status, year, search, createdBy } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (year) query.year = parseInt(year);
    if (createdBy) query.createdBy = createdBy;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // For non-admin users, only show active cohorts
    if (req.user?.role !== "ADMIN") {
      query.status = "ACTIVE";
    }

    // Get total count
    const total = await Cohort.countDocuments(query);

    // Get cohorts with pagination
    const cohorts = await Cohort.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(cohorts, total, page, limit);
    return successResponse(res, result, "Cohorts retrieved successfully");
  } catch (error) {
    logger.error("Get all cohorts error:", error);
    return errorResponse(res, error);
  }
};

// POST /cohorts - Create cohort
export const createCohort = async (req, res) => {
  try {
    const {
      name,
      description,
      programId,
      year,
      tags,
      startDate,
      endDate,
      maxParticipants,
    } = req.body;

    // Create new cohort
    const cohort = new Cohort({
      name,
      description,
      programId,
      year,
      tags,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      maxParticipants,
      createdBy: req.user._id,
    });

    await cohort.save();

    // Add creator as cohort leader
    const userCohort = new UserCohort({
      userId: req.user._id,
      cohortId: cohort._id,
      roleInCohort: "LEADER",
    });

    await userCohort.save();

    // Populate creator info
    await cohort.populate("createdBy", "name email");

    return successResponse(res, cohort, "Cohort created successfully", 201);
  } catch (error) {
    logger.error("Create cohort error:", error);
    return errorResponse(res, error);
  }
};

// GET /cohorts/:id - Get cohort by ID
export const getCohortById = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can access this cohort
    if (req.user?.role !== "ADMIN") {
      const membership = await UserCohort.isUserInCohort(
        req.user._id,
        cohort._id
      );
      if (!membership && cohort.status !== "ACTIVE") {
        return forbiddenResponse(res, "Access denied");
      }
    }

    return successResponse(res, cohort, "Cohort retrieved successfully");
  } catch (error) {
    logger.error("Get cohort by ID error:", error);
    return errorResponse(res, error);
  }
};

// PUT /cohorts/:id - Update cohort
export const updateCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can update this cohort
    if (
      req.user.role !== "ADMIN" &&
      cohort.createdBy.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    const {
      name,
      description,
      programId,
      year,
      tags,
      startDate,
      endDate,
      status,
      maxParticipants,
    } = req.body;

    // Update fields
    if (name !== undefined) cohort.name = name;
    if (description !== undefined) cohort.description = description;
    if (programId !== undefined) cohort.programId = programId;
    if (year !== undefined) cohort.year = year;
    if (tags !== undefined) cohort.tags = tags;
    if (startDate !== undefined)
      cohort.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined)
      cohort.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) cohort.status = status;
    if (maxParticipants !== undefined) cohort.maxParticipants = maxParticipants;

    await cohort.save();
    await cohort.populate("createdBy", "name email");

    return successResponse(res, cohort, "Cohort updated successfully");
  } catch (error) {
    logger.error("Update cohort error:", error);
    return errorResponse(res, error);
  }
};

// DELETE /cohorts/:id - Delete cohort
export const deleteCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can delete this cohort
    if (
      req.user.role !== "ADMIN" &&
      cohort.createdBy.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    // Delete all user-cohort relationships
    await UserCohort.deleteMany({ cohortId: cohort._id });

    // Delete the cohort
    await Cohort.findByIdAndDelete(req.params.id);

    return successResponse(res, null, "Cohort deleted successfully");
  } catch (error) {
    logger.error("Delete cohort error:", error);
    return errorResponse(res, error);
  }
};

// GET /cohorts/:id/members - Get cohort members
export const getCohortMembers = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can access this cohort
    if (req.user?.role !== "ADMIN") {
      const membership = await UserCohort.isUserInCohort(
        req.user._id,
        cohort._id
      );
      if (!membership) {
        return forbiddenResponse(res, "Access denied");
      }
    }

    const { page, limit } = getPaginationParams(req.query);
    const { role, status } = req.query;

    // Build query
    const query = { cohortId: cohort._id };
    if (role) query.roleInCohort = role;
    if (status) query.status = status;

    // Get total count
    const total = await UserCohort.countDocuments(query);

    // Get members with pagination
    const members = await UserCohort.find(query)
      .populate("userId", "name email role avatarUrl")
      .sort({ joinedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(members, total, page, limit);
    return successResponse(
      res,
      result,
      "Cohort members retrieved successfully"
    );
  } catch (error) {
    logger.error("Get cohort members error:", error);
    return errorResponse(res, error);
  }
};

// POST /cohorts/:id/members - Add user to cohort
export const addMemberToCohort = async (req, res) => {
  try {
    const { userId, roleInCohort = "MEMBER", notes } = req.body;

    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can add members to this cohort
    if (
      req.user.role !== "ADMIN" &&
      cohort.createdBy.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    // Check if cohort is full
    if (cohort.isFull()) {
      return errorResponse(res, new Error("Cohort is full"));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, "User");
    }

    // Check if user is already in cohort
    const existingMembership = await UserCohort.isUserInCohort(
      userId,
      cohort._id
    );
    if (existingMembership) {
      return errorResponse(
        res,
        new Error("User is already a member of this cohort")
      );
    }

    // Add user to cohort
    const userCohort = new UserCohort({
      userId,
      cohortId: cohort._id,
      roleInCohort,
      notes,
    });

    await userCohort.save();
    await userCohort.populate("userId", "name email role avatarUrl");

    return successResponse(
      res,
      userCohort,
      "User added to cohort successfully",
      201
    );
  } catch (error) {
    logger.error("Add member to cohort error:", error);
    return errorResponse(res, error);
  }
};

// PUT /cohorts/:id/members/:userId - Update member role
export const updateMemberRole = async (req, res) => {
  try {
    const { roleInCohort, notes } = req.body;
    const { userId } = req.params;

    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can update members in this cohort
    if (
      req.user.role !== "ADMIN" &&
      cohort.createdBy.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    // Find and update membership
    const membership = await UserCohort.findOne({
      userId,
      cohortId: cohort._id,
    });

    if (!membership) {
      return notFoundResponse(res, "Cohort membership");
    }

    if (roleInCohort !== undefined) membership.roleInCohort = roleInCohort;
    if (notes !== undefined) membership.notes = notes;

    await membership.save();
    await membership.populate("userId", "name email role avatarUrl");

    return successResponse(res, membership, "Member role updated successfully");
  } catch (error) {
    logger.error("Update member role error:", error);
    return errorResponse(res, error);
  }
};

// DELETE /cohorts/:id/members/:userId - Remove user from cohort
export const removeMemberFromCohort = async (req, res) => {
  try {
    const { userId } = req.params;

    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return notFoundResponse(res, "Cohort");
    }

    // Check if user can remove members from this cohort
    if (
      req.user.role !== "ADMIN" &&
      cohort.createdBy.toString() !== req.user._id.toString()
    ) {
      return forbiddenResponse(res, "Access denied");
    }

    // Find and remove membership
    const membership = await UserCohort.findOne({
      userId,
      cohortId: cohort._id,
    });

    if (!membership) {
      return notFoundResponse(res, "Cohort membership");
    }

    await UserCohort.findByIdAndDelete(membership._id);

    return successResponse(res, null, "User removed from cohort successfully");
  } catch (error) {
    logger.error("Remove member from cohort error:", error);
    return errorResponse(res, error);
  }
};

// GET /cohorts/user/my - Get user's cohorts
export const getUserCohorts = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { status } = req.query;

    // Build query
    const query = { userId: req.user._id };
    if (status) query.status = status;

    // Get total count
    const total = await UserCohort.countDocuments(query);

    // Get user's cohorts with pagination
    const userCohorts = await UserCohort.find(query)
      .populate("cohortId")
      .populate("cohortId.createdBy", "name email")
      .sort({ joinedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(userCohorts, total, page, limit);
    return successResponse(res, result, "User cohorts retrieved successfully");
  } catch (error) {
    logger.error("Get user cohorts error:", error);
    return errorResponse(res, error);
  }
};
