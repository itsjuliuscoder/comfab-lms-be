import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../users/models/User.js';
import { generateTokens, verifyRefreshToken } from '../../../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../../config/email.js';
import { successResponse, errorResponse, unauthorizedResponse } from '../../../utils/response.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

// POST /auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'PARTICIPANT', cohortId, roleInCohort = 'MEMBER' } = req.body;

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
      role,
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

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
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

// GET /auth/debug-token - Debug endpoint to test token generation
export const debugToken = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
        },
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Generate tokens
    const tokens = generateTokens(user._id);
    
    // Test refresh token verification
    try {
      const decoded = verifyRefreshToken(tokens.refreshToken);
      logger.info('Debug: Refresh token verification successful:', { userId: decoded.userId });
    } catch (error) {
      logger.error('Debug: Refresh token verification failed:', error);
    }

    return successResponse(res, {
      tokens,
      user: user.toPublicJSON(),
      debug: {
        jwtSecret: config.jwt.secret ? 'Set' : 'Not set',
        jwtExpiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn,
      }
    }, 'Debug token generated successfully');
  } catch (error) {
    logger.error('Debug token error:', error);
    return errorResponse(res, error);
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

    // In a real implementation, you would verify the email token
    // For now, we'll just return success
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

    // In a real implementation, you would send verification email
    // For now, we'll just return success
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

      // Clear the cohort assignment after adding to cohort
      user.cohortAssignment = null;
    }

    await user.save();

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
