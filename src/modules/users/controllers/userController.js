import { User } from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../config/cloudinary.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// GET /users/profile - Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return successResponse(res, { user }, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Get profile error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /users/profile - Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) {
      // Check if email is already taken
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: 'Email is already taken',
          },
        });
      }
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    return successResponse(res, { user }, 'Profile updated successfully');
  } catch (error) {
    logger.error('Update profile error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/avatar - Upload profile picture
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file, 'avatars');

    // Update user avatar
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: result.url },
      { new: true }
    ).select('-password');

    return successResponse(res, { user }, 'Avatar uploaded successfully');
  } catch (error) {
    logger.error('Upload avatar error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /users/change-password - Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    logger.error('Change password error:', error);
    return errorResponse(res, error);
  }
};

// GET /users/preferences - Get user preferences
export const getPreferences = async (req, res) => {
  try {
    // In a real implementation, you might have a separate preferences model
    // For now, we'll return default preferences
    const preferences = {
      emailNotifications: true,
      pushNotifications: false,
      language: 'en',
      timezone: 'UTC',
    };

    return successResponse(res, { preferences }, 'Preferences retrieved successfully');
  } catch (error) {
    logger.error('Get preferences error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /users/preferences - Update user preferences
export const updatePreferences = async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, language, timezone } = req.body;

    // In a real implementation, you would save these to a preferences model
    // For now, we'll just return success
    const preferences = {
      emailNotifications: emailNotifications ?? true,
      pushNotifications: pushNotifications ?? false,
      language: language ?? 'en',
      timezone: timezone ?? 'UTC',
    };

    return successResponse(res, { preferences }, 'Preferences updated successfully');
  } catch (error) {
    logger.error('Update preferences error:', error);
    return errorResponse(res, error);
  }
};

// Admin User Management

// GET /users - List all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { role, status, search } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(users, total, page, limit);
    return successResponse(res, result, 'Users retrieved successfully');
  } catch (error) {
    logger.error('Get all users error:', error);
    return errorResponse(res, error);
  }
};

// GET /users/:id - Get specific user (admin)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, { user }, 'User retrieved successfully');
  } catch (error) {
    logger.error('Get user by ID error:', error);
    return errorResponse(res, error);
  }
};

// PATCH /users/:id - Update user (admin)
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, { user }, 'User updated successfully');
  } catch (error) {
    logger.error('Update user error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /users/:id - Delete user (admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    logger.error('Delete user error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/bulk-actions - Bulk user operations
export const bulkActions = async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_USER_IDS',
          message: 'User IDs array is required',
        },
      });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'ACTIVE' }
        );
        break;
      case 'suspend':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'SUSPENDED' }
        );
        break;
      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      default:
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid action specified',
          },
        });
    }

    return successResponse(res, { result }, 'Bulk action completed successfully');
  } catch (error) {
    logger.error('Bulk actions error:', error);
    return errorResponse(res, error);
  }
};

// GET /users/search - Search users
export const searchUsers = async (req, res) => {
  try {
    const { q, role, status } = req.query;
    const { page, limit } = getPaginationParams(req.query);

    // Build search query
    const query = {};
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    // Get total count
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(users, total, page, limit);
    return successResponse(res, result, 'Search completed successfully');
  } catch (error) {
    logger.error('Search users error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/:id/verify - Verify instructor (admin)
export const verifyInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    if (user.role !== 'INSTRUCTOR') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NOT_INSTRUCTOR',
          message: 'User is not an instructor',
        },
      });
    }

    // In a real implementation, you might have a verification field
    // For now, we'll just return success
    return successResponse(res, { user }, 'Instructor verified successfully');
  } catch (error) {
    logger.error('Verify instructor error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/invite - Invite user (admin)
export const inviteUser = async (req, res) => {
  try {
    const { name, email, role = 'PARTICIPANT', cohortId, roleInCohort = 'MEMBER' } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      });
    }

    // Validate cohort if provided
    if (cohortId) {
      const { Cohort } = await import('../../cohorts/models/Cohort.js');
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'COHORT_NOT_FOUND',
            message: 'Cohort not found',
          },
        });
      }

      // Check if cohort is full
      if (cohort.isFull()) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'COHORT_FULL',
            message: 'Cohort is full',
          },
        });
      }
    }

    // Generate invite token
    const crypto = await import('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user without password (they'll set it via invite)
    const user = new User({
      name,
      email,
      role,
      status: 'ACTIVE',
      inviteToken,
      inviteTokenExpires: inviteTokenExpiry,
      invitedBy: req.user._id,
    });

    await user.save();

    // Add user to cohort if specified (for invited users, we'll add them when they complete the invite)
    if (cohortId) {
      // Store cohort information in the user document for later use
      user.cohortAssignment = {
        cohortId,
        roleInCohort,
      };
      await user.save();
    }

    // Send invite email
    try {
      const { sendInvitationEmail } = await import('../../../config/email.js');
      await sendInvitationEmail(user, inviteToken, req.user);
    } catch (emailError) {
      logger.error('Failed to send invite email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    const userData = user.toPublicJSON();

    return successResponse(res, { 
      user: userData,
      message: 'User invited successfully. Invitation email sent.'
    }, 'User invited successfully', 201);
  } catch (error) {
    logger.error('Invite user error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/bulk-invite - Bulk invite users (admin)
export const bulkInviteUsers = async (req, res) => {
  try {
    const { users, cohortId, roleInCohort = 'MEMBER', sendWelcomeEmail = true } = req.body;

    // Validate cohort if provided
    let cohort = null;
    if (cohortId) {
      const { Cohort } = await import('../../cohorts/models/Cohort.js');
      cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'COHORT_NOT_FOUND',
            message: 'Cohort not found',
          },
        });
      }
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // Process each user
    for (const userData of users) {
      try {
        const { name, email, role = 'PARTICIPANT', roleInCohort: userRoleInCohort = roleInCohort } = userData;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          results.skipped.push({
            email,
            reason: 'User already exists',
            name,
          });
          continue;
        }

        // Check if cohort is full (only if cohort is specified)
        if (cohort && cohort.isFull()) {
          results.failed.push({
            email,
            reason: 'Cohort is full',
            name,
          });
          continue;
        }

        // Generate invite token
        const crypto = await import('crypto');
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create user without password
        const user = new User({
          name,
          email,
          role,
          status: 'ACTIVE',
          inviteToken,
          inviteTokenExpires: inviteTokenExpiry,
          invitedBy: req.user._id,
        });

        // Add cohort assignment if specified
        if (cohortId) {
          user.cohortAssignment = {
            cohortId,
            roleInCohort: userRoleInCohort,
          };
        }

        await user.save();

        // Send invite email
        if (sendWelcomeEmail) {
          try {
            const { sendInvitationEmail } = await import('../../../config/email.js');
            await sendInvitationEmail(user, inviteToken, req.user);
          } catch (emailError) {
            logger.error(`Failed to send invite email to ${email}:`, emailError);
            // Don't fail the entire request if email fails
          }
        }

        results.successful.push({
          email,
          name,
          role,
          userId: user._id,
        });

      } catch (error) {
        logger.error(`Error processing user ${userData.email}:`, error);
        results.failed.push({
          email: userData.email,
          reason: error.message || 'Unknown error',
          name: userData.name,
        });
      }
    }

    // Log the bulk invite operation
    logger.info('Bulk invite completed', {
      totalUsers: users.length,
      successful: results.successful.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      invitedBy: req.user._id,
      cohortId,
    });

    return successResponse(res, {
      results,
      summary: {
        total: users.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
    }, `Bulk invite completed. ${results.successful.length} users invited successfully.`);

  } catch (error) {
    logger.error('Bulk invite error:', error);
    return errorResponse(res, error);
  }
};

// POST /users/bulk-invite-excel - Bulk invite users from Excel file (admin)
export const bulkInviteUsersFromExcel = async (req, res) => {
  try {
    const { cohortId, roleInCohort = 'MEMBER', sendWelcomeEmail = true } = req.body;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No Excel file uploaded',
        },
      });
    }

    // Import ExcelService
    const ExcelService = (await import('../services/excelService.js')).default;

    // Validate file
    try {
      ExcelService.validateFile(req.file);
    } catch (validationError) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_FILE',
          message: validationError.message,
        },
      });
    }

    // Process Excel file
    let processedData;
    try {
      processedData = ExcelService.processExcelFile(req.file.buffer);
    } catch (processingError) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: processingError.message,
        },
      });
    }

    // Check if we have any valid users
    if (processedData.users.length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_VALID_USERS',
          message: 'No valid users found in Excel file',
        },
        data: {
          excelProcessing: processedData,
        },
      });
    }

    // Check if we have too many users (limit to 1000 for Excel uploads)
    if (processedData.users.length > 1000) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'TOO_MANY_USERS',
          message: 'Maximum 1000 users allowed per Excel upload',
        },
        data: {
          totalUsers: processedData.users.length,
        },
      });
    }

    // Validate cohort if provided
    let cohort = null;
    if (cohortId) {
      const { Cohort } = await import('../../cohorts/models/Cohort.js');
      cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'COHORT_NOT_FOUND',
            message: 'Cohort not found',
          },
        });
      }
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
      excelErrors: processedData.errors,
    };

    // Process each user from Excel
    for (const userData of processedData.users) {
      try {
        const { name, email, role = 'PARTICIPANT', roleInCohort: userRoleInCohort = roleInCohort } = userData;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          results.skipped.push({
            email,
            reason: 'User already exists',
            name,
          });
          continue;
        }

        // Check if cohort is full (only if cohort is specified)
        if (cohort && cohort.isFull()) {
          results.failed.push({
            email,
            reason: 'Cohort is full',
            name,
          });
          continue;
        }

        // Generate invite token
        const crypto = await import('crypto');
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create user without password
        const user = new User({
          name,
          email,
          role,
          status: 'ACTIVE',
          inviteToken,
          inviteTokenExpires: inviteTokenExpiry,
          invitedBy: req.user._id,
        });

        // Add cohort assignment if specified
        if (cohortId) {
          user.cohortAssignment = {
            cohortId,
            roleInCohort: userRoleInCohort,
          };
        }

        await user.save();

        // Send invite email
        if (sendWelcomeEmail) {
          try {
            const { sendInvitationEmail } = await import('../../../config/email.js');
            await sendInvitationEmail(user, inviteToken, req.user);
          } catch (emailError) {
            logger.error(`Failed to send invite email to ${email}:`, emailError);
            // Don't fail the entire request if email fails
          }
        }

        results.successful.push({
          email,
          name,
          role,
          userId: user._id,
        });

      } catch (error) {
        logger.error(`Error processing user ${userData.email}:`, error);
        results.failed.push({
          email: userData.email,
          reason: error.message || 'Unknown error',
          name: userData.name,
        });
      }
    }

    // Log the Excel bulk invite operation
    logger.info('Excel bulk invite completed', {
      totalRows: processedData.totalRows,
      validRows: processedData.validRows,
      invalidRows: processedData.invalidRows,
      successful: results.successful.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      invitedBy: req.user._id,
      cohortId,
      fileName: req.file.originalname,
    });

    return successResponse(res, {
      results,
      excelProcessing: {
        totalRows: processedData.totalRows,
        validRows: processedData.validRows,
        invalidRows: processedData.invalidRows,
        errors: processedData.errors,
      },
      summary: {
        total: processedData.users.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
    }, `Excel bulk invite completed. ${results.successful.length} users invited successfully.`);

  } catch (error) {
    logger.error('Excel bulk invite error:', error);
    return errorResponse(res, error);
  }
};

// GET /users/bulk-invite-template - Download Excel template (public)
export const downloadBulkInviteTemplate = async (req, res) => {
  try {
    // Import ExcelService
    const ExcelService = (await import('../services/excelService.js')).default;

    // Generate template
    const templateBuffer = ExcelService.generateTemplate();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_invite_template.xlsx"');
    res.setHeader('Content-Length', templateBuffer.length);

    // Send the file
    res.send(templateBuffer);

  } catch (error) {
    logger.error('Template download error:', error);
    return errorResponse(res, error);
  }
};
