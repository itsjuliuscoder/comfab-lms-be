import { User } from '../../users/models/User.js';
import { Course } from '../../courses/models/Course.js';
import { Enrollment } from '../../enrollments/models/Enrollment.js';
import { Cohort } from '../../cohorts/models/Cohort.js';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';

// GET /analytics/platform - Get platform overview analytics
export const getPlatformAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCohorts,
      activeUsers,
      publishedCourses,
      completedEnrollments
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Cohort.countDocuments(),
      User.countDocuments({ status: 'ACTIVE' }),
      Course.countDocuments({ status: 'PUBLISHED' }),
      Enrollment.countDocuments({ status: 'COMPLETED' })
    ]);

    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments * 100).toFixed(2) : 0;

    const platformAnalytics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        roles: {
          admins: await User.countDocuments({ role: 'ADMIN' }),
          instructors: await User.countDocuments({ role: 'INSTRUCTOR' }),
          participants: await User.countDocuments({ role: 'PARTICIPANT' })
        }
      },
      courses: {
        total: totalCourses,
        published: publishedCourses
      },
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments,
        completionRate: `${completionRate}%`
      },
      cohorts: {
        total: totalCohorts,
        active: await Cohort.countDocuments({ status: 'ACTIVE' })
      }
    };

    return successResponse(res, platformAnalytics, 'Platform analytics retrieved successfully');
  } catch (error) {
    logger.error('Get platform analytics error:', error);
    return errorResponse(res, error);
  }
};

// GET /analytics/users - Get user analytics
export const getUserAnalytics = async (req, res) => {
  try {
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] }
          }
        }
      }
    ]);

    const usersByStatus = await User.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const userAnalytics = {
      byRole: usersByRole,
      byStatus: usersByStatus,
      recentActive: await User.find({
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
      .select('name email role lastLoginAt')
      .sort({ lastLoginAt: -1 })
      .limit(10)
    };

    return successResponse(res, userAnalytics, 'User analytics retrieved successfully');
  } catch (error) {
    logger.error('Get user analytics error:', error);
    return errorResponse(res, error);
  }
};

// GET /analytics/courses - Get course analytics
export const getCourseAnalytics = async (req, res) => {
  try {
    const coursesByStatus = await Course.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const coursesByDifficulty = await Course.aggregate([
      {
        $group: {
          _id: "$difficulty",
          count: { $sum: 1 }
        }
      }
    ]);

    const topCourses = await Course.aggregate([
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'courseId',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          enrollmentCount: { $size: "$enrollments" }
        }
      },
      {
        $sort: { enrollmentCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          title: 1,
          summary: 1,
          enrollmentCount: 1,
          status: 1,
          difficulty: 1
        }
      }
    ]);

    const courseAnalytics = {
      byStatus: coursesByStatus,
      byDifficulty: coursesByDifficulty,
      topCourses
    };

    return successResponse(res, courseAnalytics, 'Course analytics retrieved successfully');
  } catch (error) {
    logger.error('Get course analytics error:', error);
    return errorResponse(res, error);
  }
};

// GET /analytics/enrollments - Get enrollment analytics
export const getEnrollmentAnalytics = async (req, res) => {
  try {
    const enrollmentsByStatus = await Enrollment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const averageProgressByCourse = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $group: {
          _id: '$courseId',
          courseTitle: { $first: '$course.title' },
          averageProgress: { $avg: '$progressPct' },
          totalEnrollments: { $sum: 1 }
        }
      },
      {
        $sort: { averageProgress: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const enrollmentAnalytics = {
      byStatus: enrollmentsByStatus,
      averageProgress: averageProgressByCourse
    };

    return successResponse(res, enrollmentAnalytics, 'Enrollment analytics retrieved successfully');
  } catch (error) {
    logger.error('Get enrollment analytics error:', error);
    return errorResponse(res, error);
  }
};

// GET /analytics/cohorts - Get cohort analytics
export const getCohortAnalytics = async (req, res) => {
  try {
    const cohortsByStatus = await Cohort.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const cohortsByYear = await Cohort.aggregate([
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    const cohortAnalytics = {
      byStatus: cohortsByStatus,
      byYear: cohortsByYear
    };

    return successResponse(res, cohortAnalytics, 'Cohort analytics retrieved successfully');
  } catch (error) {
    logger.error('Get cohort analytics error:', error);
    return errorResponse(res, error);
  }
};
