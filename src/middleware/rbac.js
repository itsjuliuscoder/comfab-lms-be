import { forbiddenResponse } from '../utils/response.js';

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';
export const ADMIN_ROLE = 'ADMIN';
export const INSTRUCTOR_ROLE = 'INSTRUCTOR';
export const PARTICIPANT_ROLE = 'PARTICIPANT';

export const isSuperAdminRole = (role) => role === SUPER_ADMIN_ROLE;
export const isAdminRole = (role) => role === SUPER_ADMIN_ROLE || role === ADMIN_ROLE;
export const isInstructorRole = (role) => isAdminRole(role) || role === INSTRUCTOR_ROLE;
export const isParticipantRole = (role) => isInstructorRole(role) || role === PARTICIPANT_ROLE;

export const requireRole = (...roles) => {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return forbiddenResponse(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

export const requireSuperAdmin = (req, res, next) => {
  return requireRole(SUPER_ADMIN_ROLE)(req, res, next);
};

export const requireAdmin = (req, res, next) => {
  return requireRole(SUPER_ADMIN_ROLE, ADMIN_ROLE)(req, res, next);
};

export const requireInstructor = (req, res, next) => {
  return requireRole(SUPER_ADMIN_ROLE, ADMIN_ROLE, INSTRUCTOR_ROLE)(req, res, next);
};

export const requireParticipant = (req, res, next) => {
  return requireRole(SUPER_ADMIN_ROLE, ADMIN_ROLE, INSTRUCTOR_ROLE, PARTICIPANT_ROLE)(req, res, next);
};

export const requireOwnerOrAdmin = (resourceOwnerField = 'ownerId') => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admins can access everything
    if (isAdminRole(req.user.role)) {
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
    if (isAdminRole(req.user.role)) {
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
    if (isInstructorRole(req.user.role)) {
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
