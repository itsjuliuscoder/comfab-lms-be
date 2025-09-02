import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../modules/users/models/User.js';
import { unauthorizedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return unauthorizedResponse(res, 'Access token required');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      return unauthorizedResponse(res, 'Account is suspended');
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return unauthorizedResponse(res, 'Invalid token');
    }
    
    if (error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Token expired');
    }
    
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // For optional auth, we just continue without setting req.user
    next();
  }
};

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret);
    return decoded;
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    throw error;
  }
};
