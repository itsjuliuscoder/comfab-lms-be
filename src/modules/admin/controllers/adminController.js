import { User } from '../../users/models/User.js';
import { Course } from '../../courses/models/Course.js';
import { Section } from '../../courses/models/Section.js';
import { Lesson } from '../../courses/models/Lesson.js';
import { Enrollment } from '../../enrollments/models/Enrollment.js';
import { Cohort } from '../../cohorts/models/Cohort.js';
import { UserCohort } from '../../cohorts/models/UserCohort.js';
import { Activity } from '../../activities/models/Activity.js';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';

// GET /admin/dashboard - Get comprehensive admin dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get all statistics in parallel for better performance
    const [
      userStats,
      courseStats,
      enrollmentStats,
      completionStats,
      recentActivity,
      topCourses,
      topUsers
    ] = await Promise.all([
      getUserStats(daysAgo),
      getCourseStats(daysAgo),
      getEnrollmentStats(daysAgo),
      getCompletionStats(daysAgo),
      getRecentActivity(daysAgo),
      getTopCourses(daysAgo),
      getTopUsers(daysAgo)
    ]);

    const dashboardStats = {
      overview: {
        totalUsers: userStats.total,
        totalCourses: courseStats.total,
        totalEnrollments: enrollmentStats.total,
        totalCohorts: await Cohort.countDocuments(),
        totalLessons: await Lesson.countDocuments(),
        totalSections: await Section.countDocuments(),
      },
      userStats,
      courseStats,
      enrollmentStats,
      completionStats,
      recentActivity,
      topCourses,
      topUsers,
      generatedAt: new Date(),
      period: `${days} days`
    };

    return successResponse(res, dashboardStats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    return errorResponse(res, error);
  }
};

// GET /admin/stats/users - Get detailed user statistics
export const getUserStatistics = async (req, res) => {
  try {
    const { days = 30, groupBy = 'role' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const userStats = await getUserStats(daysAgo, groupBy);
    
    return successResponse(res, userStats, 'User statistics retrieved successfully');
  } catch (error) {
    logger.error('Get user statistics error:', error);
    return errorResponse(res, error);
  }
};

// GET /admin/stats/courses - Get detailed course statistics
export const getCourseStatistics = async (req, res) => {
  try {
    const { days = 30, status } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const courseStats = await getCourseStats(daysAgo, status);
    
    return successResponse(res, courseStats, 'Course statistics retrieved successfully');
  } catch (error) {
    logger.error('Get course statistics error:', error);
    return errorResponse(res, error);
  }
};

// GET /admin/stats/enrollments - Get detailed enrollment statistics
export const getEnrollmentStatistics = async (req, res) => {
  try {
    const { days = 30, status } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const enrollmentStats = await getEnrollmentStats(daysAgo, status);
    
    return successResponse(res, enrollmentStats, 'Enrollment statistics retrieved successfully');
  } catch (error) {
    logger.error('Get enrollment statistics error:', error);
    return errorResponse(res, error);
  }
};

// GET /admin/stats/completion - Get completion rate statistics
export const getCompletionStatistics = async (req, res) => {
  try {
    const { days = 30, courseId } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const completionStats = await getCompletionStats(daysAgo, courseId);
    
    return successResponse(res, completionStats, 'Completion statistics retrieved successfully');
  } catch (error) {
    logger.error('Get completion statistics error:', error);
    return errorResponse(res, error);
  }
};

// Helper Functions

async function getUserStats(daysAgo, groupBy = 'role') {
  const total = await User.countDocuments();
  const newUsers = await User.countDocuments({ createdAt: { $gte: daysAgo } });
  const activeUsers = await User.countDocuments({ lastLoginAt: { $gte: daysAgo } });

  // Get users by role
  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        newUsers: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', daysAgo] }, 1, 0]
          }
        }
      }
    }
  ]);

  // Get users by status
  const usersByStatus = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get user growth over time
  const userGrowth = await User.aggregate([
    {
      $match: { createdAt: { $gte: daysAgo } }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    total,
    newUsers,
    activeUsers,
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item._id] = { total: item.count, newUsers: item.newUsers };
      return acc;
    }, {}),
    usersByStatus: usersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    userGrowth,
    averageUsersPerDay: Math.round(newUsers / Math.ceil((Date.now() - daysAgo.getTime()) / (1000 * 60 * 60 * 24)))
  };
}

async function getCourseStats(daysAgo, status) {
  const total = await Course.countDocuments();
  const newCourses = await Course.countDocuments({ createdAt: { $gte: daysAgo } });
  const publishedCourses = await Course.countDocuments({ status: 'PUBLISHED' });
  const draftCourses = await Course.countDocuments({ status: 'DRAFT' });
  const archivedCourses = await Course.countDocuments({ status: 'ARCHIVED' });

  // Get courses by difficulty
  const coursesByDifficulty = await Course.aggregate([
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
        newCourses: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', daysAgo] }, 1, 0]
          }
        }
      }
    }
  ]);

  // Get courses by status
  const coursesByStatus = await Course.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get course creation growth
  const courseGrowth = await Course.aggregate([
    {
      $match: { createdAt: { $gte: daysAgo } }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get average course metrics
  const avgCourseMetrics = await Course.aggregate([
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$estimatedDuration' },
        avgEnrollmentLimit: { $avg: '$enrollmentLimit' },
        totalSections: { $sum: '$sectionCount' },
        totalLessons: { $sum: '$lessonCount' }
      }
    }
  ]);

  return {
    total,
    newCourses,
    publishedCourses,
    draftCourses,
    archivedCourses,
    coursesByDifficulty: coursesByDifficulty.reduce((acc, item) => {
      acc[item._id] = { total: item.count, newCourses: item.newCourses };
      return acc;
    }, {}),
    coursesByStatus: coursesByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    courseGrowth,
    averageMetrics: avgCourseMetrics[0] || {
      avgDuration: 0,
      avgEnrollmentLimit: 0,
      totalSections: 0,
      totalLessons: 0
    }
  };
}

async function getEnrollmentStats(daysAgo, status) {
  const total = await Enrollment.countDocuments();
  const newEnrollments = await Enrollment.countDocuments({ enrolledAt: { $gte: daysAgo } });
  const activeEnrollments = await Enrollment.countDocuments({ status: 'ACTIVE' });
  const completedEnrollments = await Enrollment.countDocuments({ status: 'COMPLETED' });
  const withdrawnEnrollments = await Enrollment.countDocuments({ status: 'WITHDRAWN' });

  // Get enrollments by status
  const enrollmentsByStatus = await Enrollment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        newEnrollments: {
          $sum: {
            $cond: [{ $gte: ['$enrolledAt', daysAgo] }, 1, 0]
          }
        }
      }
    }
  ]);

  // Get enrollment growth
  const enrollmentGrowth = await Enrollment.aggregate([
    {
      $match: { enrolledAt: { $gte: daysAgo } }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get average progress
  const avgProgress = await Enrollment.aggregate([
    {
      $group: {
        _id: null,
        avgProgress: { $avg: '$progressPct' },
        avgActiveProgress: {
          $avg: {
            $cond: [{ $eq: ['$status', 'ACTIVE'] }, '$progressPct', null]
          }
        }
      }
    }
  ]);

  return {
    total,
    newEnrollments,
    activeEnrollments,
    completedEnrollments,
    withdrawnEnrollments,
    enrollmentsByStatus: enrollmentsByStatus.reduce((acc, item) => {
      acc[item._id] = { total: item.count, newEnrollments: item.newEnrollments };
      return acc;
    }, {}),
    enrollmentGrowth,
    averageProgress: avgProgress[0] || { avgProgress: 0, avgActiveProgress: 0 }
  };
}

async function getCompletionStats(daysAgo, courseId) {
  const totalEnrollments = await Enrollment.countDocuments();
  const totalCompleted = await Enrollment.countDocuments({ status: 'COMPLETED' });
  const recentCompleted = await Enrollment.countDocuments({ 
    status: 'COMPLETED', 
    completedAt: { $gte: daysAgo } 
  });

  // Calculate completion rates
  const overallCompletionRate = totalEnrollments > 0 ? (totalCompleted / totalEnrollments) * 100 : 0;
  const recentCompletionRate = totalEnrollments > 0 ? (recentCompleted / totalEnrollments) * 100 : 0;

  // Get completion by course
  const completionByCourse = await Enrollment.aggregate([
    {
      $group: {
        _id: '$courseId',
        totalEnrollments: { $sum: 1 },
        completedEnrollments: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        },
        avgProgress: { $avg: '$progressPct' }
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course'
      }
    },
    {
      $unwind: '$course'
    },
    {
      $project: {
        courseTitle: '$course.title',
        totalEnrollments: 1,
        completedEnrollments: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedEnrollments', '$totalEnrollments'] },
            100
          ]
        },
        avgProgress: 1
      }
    },
    { $sort: { completionRate: -1 } }
  ]);

  // Get completion growth
  const completionGrowth = await Enrollment.aggregate([
    {
      $match: { 
        status: 'COMPLETED',
        completedAt: { $gte: daysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    totalEnrollments,
    totalCompleted,
    recentCompleted,
    overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
    recentCompletionRate: Math.round(recentCompletionRate * 100) / 100,
    completionByCourse,
    completionGrowth
  };
}

async function getRecentActivity(daysAgo) {
  const recentActivities = await Activity.find({ performedAt: { $gte: daysAgo } })
    .sort({ performedAt: -1 })
    .limit(20)
    .populate('actor.userId', 'name email role')
    .populate('target.id', 'title name');

  return recentActivities.map(activity => ({
    id: activity._id,
    action: activity.action,
    actor: activity.actor,
    target: activity.target,
    performedAt: activity.performedAt,
    status: activity.status
  }));
}

async function getTopCourses(daysAgo) {
  const topCourses = await Enrollment.aggregate([
    {
      $match: { enrolledAt: { $gte: daysAgo } }
    },
    {
      $group: {
        _id: '$courseId',
        enrollmentCount: { $sum: 1 },
        avgProgress: { $avg: '$progressPct' },
        completionCount: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course'
      }
    },
    {
      $unwind: '$course'
    },
    {
      $project: {
        courseTitle: '$course.title',
        courseId: '$_id',
        enrollmentCount: 1,
        avgProgress: 1,
        completionCount: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completionCount', '$enrollmentCount'] },
            100
          ]
        }
      }
    },
    { $sort: { enrollmentCount: -1 } },
    { $limit: 10 }
  ]);

  return topCourses;
}

async function getTopUsers(daysAgo) {
  const topUsers = await Activity.aggregate([
    {
      $match: { 
        performedAt: { $gte: daysAgo },
        'actor.userId': { $ne: null }
      }
    },
    {
      $group: {
        _id: '$actor.userId',
        name: { $first: '$actor.name' },
        email: { $first: '$actor.email' },
        role: { $first: '$actor.role' },
        activityCount: { $sum: 1 },
        lastActivity: { $max: '$performedAt' }
      }
    },
    { $sort: { activityCount: -1 } },
    { $limit: 10 }
  ]);

  return topUsers;
}
