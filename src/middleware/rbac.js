import { forbiddenResponse } from '../utils/response.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(res, `Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

export const requireAdmin = (req, res, next) => {
  return requireRole('ADMIN')(req, res, next);
};

export const requireInstructor = (req, res, next) => {
  return requireRole('ADMIN', 'INSTRUCTOR')(req, res, next);
};

export const requireParticipant = (req, res, next) => {
  return requireRole('ADMIN', 'INSTRUCTOR', 'PARTICIPANT')(req, res, next);
};

export const requireOwnerOrAdmin = (resourceOwnerField = 'ownerId') => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admins can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check if user owns the resource
    const resourceOwnerId = req.params[resourceOwnerField] || req.body[resourceOwnerField];
    
    if (resourceOwnerId && resourceOwnerId.toString() === req.user._id.toString()) {
      return next();
    }

    return forbiddenResponse(res, 'Access denied. You can only access your own resources.');
  };
};

export const requireCohortMember = (cohortIdField = 'cohortId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admins can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const cohortId = req.params[cohortIdField] || req.body[cohortIdField];
    
    if (!cohortId) {
      return forbiddenResponse(res, 'Cohort ID required');
    }

    try {
      const { UserCohort } = await import('../modules/cohorts/models/UserCohort.js');
      const membership = await UserCohort.isUserInCohort(req.user._id, cohortId);
      
      if (!membership) {
        return forbiddenResponse(res, 'You are not a member of this cohort');
      }

      req.cohortMembership = membership;
      next();
    } catch (error) {
      return forbiddenResponse(res, 'Error checking cohort membership');
    }
  };
};

export const requireCourseEnrollment = (courseIdField = 'courseId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admins and instructors can access everything
    if (req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR') {
      return next();
    }

    const courseId = req.params[courseIdField] || req.body[courseIdField];
    
    if (!courseId) {
      return forbiddenResponse(res, 'Course ID required');
    }

    try {
      const { Enrollment } = await import('../modules/enrollments/models/Enrollment.js');
      const enrollment = await Enrollment.isUserEnrolled(req.user._id, courseId);
      
      if (!enrollment) {
        return forbiddenResponse(res, 'You are not enrolled in this course');
      }

      req.enrollment = enrollment;
      next();
    } catch (error) {
      return forbiddenResponse(res, 'Error checking course enrollment');
    }
  };
};
