import crypto from 'crypto';
import { User } from '../../users/models/User.js';
import { generateTokens, verifyRefreshToken } from '../../../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../../config/email.js';
import { sendUserVerificationEmail } from '../../../utils/emailVerification.js';
import { createNotification, notifyAdmins } from '../../notifications/services/notificationService.js';
import { successResponse, errorResponse, unauthorizedResponse } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';

const PLATFORM_ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

async function notifyInviterOfAcceptedInvite(user) {
  if (!user?.invitedBy) {
    return;
  }

  try {
    const inviter = await User.findById(user.invitedBy).select('role');
    if (!inviter || !PLATFORM_ADMIN_ROLES.includes(inviter.role)) {
      return;
    }

    await createNotification({
      userId: inviter._id,
      type: 'SYSTEM',
      title: 'Invite accepted',
      message: `${user.name} accepted your invitation and completed signup.`,
      link: '/dashboard/users',
      data: {
        invitedUserId: user._id.toString(),
        invitedUserEmail: user.email,
        invitedUserRole: user.role,
        inviterId: inviter._id.toString(),
      },
      priority: 'MEDIUM',
    });
  } catch (notificationError) {
    logger.error('Failed to notify inviter of accepted invite:', notificationError);
  }
}

// POST /auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, cohortId, roleInCohort = 'MEMBER' } = req.body;

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

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: 'PARTICIPANT',
    });

    await user.save();

    // Add user to cohort if specified
    if (cohortId) {
      const { UserCohort } = await import('../../cohorts/models/UserCohort.js');
      
      // Check if user is already in cohort (shouldn't happen for new users, but safety check)
      const existingMembership = await UserCohort.isUserInCohort(user._id, cohortId);
      if (!existingMembership) {
        const userCohort = new UserCohort({
          userId: user._id,
          cohortId,
          roleInCohort,
        });
        await userCohort.save();
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Send welcome and verification emails
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    try {
      await sendUserVerificationEmail(user);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
    }

    try {
      await notifyAdmins({
        type: 'SYSTEM',
        title: 'New user registration',
        message: `${user.name} (${user.email}) registered as ${user.role}.`,
        link: '/dashboard/users',
        data: { userId: user._id.toString() },
        priority: 'LOW',
      });
    } catch (notificationError) {
      logger.error('Failed to notify admins of registration:', notificationError);
    }

    // Return user data without password
    const userData = user.toPublicJSON();

    return successResponse(res, {
      user: userData,
      accessToken,
      refreshToken,
    }, 'User registered successfully', 201);
  } catch (error) {
    logger.error('Registration error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return unauthorizedResponse(res, 'Account is suspended');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const userData = user.toPublicJSON();

    return successResponse(res, {
      user: userData,
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/logout
export const logout = async (req, res) => {
  try {
    // In a more complex implementation, you might want to blacklist the token
    // For now, we'll just return success
    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return unauthorizedResponse(res, 'Refresh token required');
    }

    // Debug logging
    logger.info('Refresh token received:', { 
      tokenLength: refreshToken.length,
      tokenPrefix: refreshToken.substring(0, 20) + '...'
    });

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      logger.info('Refresh token decoded successfully:', { userId: decoded.userId });
    } catch (tokenError) {
      logger.error('Refresh token verification failed:', tokenError);
      return unauthorizedResponse(res, 'Invalid refresh token');
    }
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      logger.error('User not found or inactive for refresh token:', { userId: decoded.userId });
      return unauthorizedResponse(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);
    logger.info('New tokens generated successfully for user:', { userId: user._id });

    return successResponse(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    logger.error('Token refresh error:', error);
    return unauthorizedResponse(res, 'Invalid refresh token');
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return successResponse(res, null, 'If the email exists, a password reset link has been sent');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      return errorResponse(res, new Error('Failed to send password reset email'));
    }

    return successResponse(res, null, 'If the email exists, a password reset link has been sent');
  } catch (error) {
    logger.error('Forgot password error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    logger.error('Reset password error:', error);
    return errorResponse(res, error);
  }
};

// GET /auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Verification token is required',
        },
      });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'Invalid or expired verification token',
        },
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    logger.error('Email verification error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/resend-verification
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Email is already verified',
        },
      });
    }

    try {
      await sendUserVerificationEmail(user);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      return errorResponse(res, new Error('Failed to send verification email'));
    }

    return successResponse(res, null, 'Verification email sent successfully');
  } catch (error) {
    logger.error('Resend verification error:', error);
    return errorResponse(res, error);
  }
};

// GET /auth/accept-invite - Accept invitation and set password
export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Invitation token is required',
        },
      });
    }

    // Find user with valid invite token
    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INVITE_TOKEN',
          message: 'Invalid or expired invitation token',
        },
      });
    }

    // Return user info for the frontend to show the form
    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    }, 'Invitation token valid');
  } catch (error) {
    logger.error('Accept invite error:', error);
    return errorResponse(res, error);
  }
};

// POST /auth/complete-invite - Complete invitation by setting password
export const completeInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Token and password are required',
        },
      });
    }

    // Find user with valid invite token
    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INVITE_TOKEN',
          message: 'Invalid or expired invitation token',
        },
      });
    }

    // Set password and clear invite token
    user.password = password;
    user.inviteToken = null;
    user.inviteTokenExpires = null;
    user.emailVerified = true;

    const assignedProgramId = user.cohortAssignment?.programId || null;

    // Add user to cohort if they were assigned one during invitation
    if (user.cohortAssignment && user.cohortAssignment.cohortId) {
      const { UserCohort } = await import('../../cohorts/models/UserCohort.js');
      
      // Check if user is already in cohort (safety check)
      const existingMembership = await UserCohort.isUserInCohort(user._id, user.cohortAssignment.cohortId);
      if (!existingMembership) {
        const userCohort = new UserCohort({
          userId: user._id,
          cohortId: user.cohortAssignment.cohortId,
          roleInCohort: user.cohortAssignment.roleInCohort || 'MEMBER',
        });
        await userCohort.save();
      }
    }

    // Clear cohort assignment after processing
    if (user.cohortAssignment) {
      user.cohortAssignment = null;
    }

    await user.save();
    await notifyInviterOfAcceptedInvite(user);

    // Enroll in program when invited with a program assignment
    if (assignedProgramId) {
      const { enrollUserInProgram } = await import('../../programs/services/programEnrollmentService.js');
      await enrollUserInProgram(user._id, assignedProgramId, {
        status: 'ACTIVE',
        skipCapacityCheck: true,
      });
    }

    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokens(user._id);

    const userData = user.toPublicJSON();

    return successResponse(res, {
      user: userData,
      accessToken,
      refreshToken,
    }, 'Account setup completed successfully');
  } catch (error) {
    logger.error('Complete invite error:', error);
    return errorResponse(res, error);
  }
};
