import { Activity } from '../models/Activity.js';
import ActivityService from '../services/activityService.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// POST /activities - Create a new activity
export const createActivity = async (req, res) => {
  try {
    const {
      action,
      actor,
      target,
      context,
      metadata
    } = req.body;

    // Validate required fields
    if (!action) {
      return errorResponse(res, new Error('Action is required'), 400);
    }

    if (!actor) {
      return errorResponse(res, new Error('Actor information is required'), 400);
    }

    if (!target) {
      return errorResponse(res, new Error('Target information is required'), 400);
    }

    // If actor information is not provided, use current user (if authenticated)
    const actorInfo = actor || (req.user ? {
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    } : {
      userId: null,
      name: 'Anonymous User',
      email: 'anonymous@system.local',
      role: 'ANONYMOUS'
    });

    // Create activity using ActivityService
    const activity = await ActivityService.logActivity({
      action,
      actor: actorInfo,
      target,
      context,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (!activity) {
      return errorResponse(res, new Error('Failed to create activity'), 500);
    }

    return successResponse(res, activity, 'Activity created successfully', 201);
  } catch (error) {
    logger.error('Create activity error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities - Get all activities (Admin only)
export const getAllActivities = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { 
      action, 
      actorId, 
      actorRole, 
      targetType, 
      targetId, 
      status, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Build query
    const query = {};
    
    if (action) query.action = action;
    if (actorId) query['actor.userId'] = actorId;
    if (actorRole) query['actor.role'] = actorRole;
    if (targetType) query['target.type'] = targetType;
    if (targetId) query['target.id'] = targetId;
    if (status) query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }
    
    // Search in actor name, target name, or action
    if (search) {
      query.$or = [
        { 'actor.name': { $regex: search, $options: 'i' } },
        { 'actor.email': { $regex: search, $options: 'i' } },
        { 'target.name': { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await Activity.countDocuments(query);

    // Get activities with pagination
    const activities = await Activity.find(query)
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(activities, total, page, limit);
    return successResponse(res, result, 'Activities retrieved successfully');
  } catch (error) {
    logger.error('Get all activities error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities/dashboard - Get dashboard summary (Admin only)
export const getDashboardSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const summary = await ActivityService.getDashboardSummary(parseInt(days));
    
    return successResponse(res, summary, 'Dashboard summary retrieved successfully');
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities/user/:userId - Get user activities (Admin or self)
export const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = getPaginationParams(req.query);
    const { action, targetType, startDate, endDate } = req.query;

    // Check if user can access this data
    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== userId) {
      return forbiddenResponse(res, 'Access denied');
    }

    // Build query
    const query = { 'actor.userId': userId };
    
    if (action) query.action = action;
    if (targetType) query['target.type'] = targetType;
    
    // Date range filter
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }

    // Get total count
    const total = await Activity.countDocuments(query);

    // Get activities with pagination
    const activities = await Activity.find(query)
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(activities, total, page, limit);
    return successResponse(res, result, 'User activities retrieved successfully');
  } catch (error) {
    logger.error('Get user activities error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities/target/:type/:id - Get target activities (Admin only)
export const getTargetActivities = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { page, limit } = getPaginationParams(req.query);
    const { action, actorRole, startDate, endDate } = req.query;

    // Build query
    const query = { 'target.type': type.toUpperCase(), 'target.id': id };
    
    if (action) query.action = action;
    if (actorRole) query['actor.role'] = actorRole;
    
    // Date range filter
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }

    // Get total count
    const total = await Activity.countDocuments(query);

    // Get activities with pagination
    const activities = await Activity.find(query)
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(activities, total, page, limit);
    return successResponse(res, result, 'Target activities retrieved successfully');
  } catch (error) {
    logger.error('Get target activities error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities/summary - Get activity summary (Admin only)
export const getActivitySummary = async (req, res) => {
  try {
    const { days = 30, groupBy = 'action' } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    let pipeline = [
      {
        $match: {
          performedAt: { $gte: daysAgo },
        },
      },
    ];

    // Group by different fields
    switch (groupBy) {
      case 'action':
        pipeline.push({
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastPerformed: { $max: '$performedAt' },
            uniqueUsers: { $addToSet: '$actor.userId' },
          },
        });
        break;
      case 'actor':
        pipeline.push({
          $group: {
            _id: '$actor.userId',
            name: { $first: '$actor.name' },
            email: { $first: '$actor.email' },
            role: { $first: '$actor.role' },
            count: { $sum: 1 },
            lastActivity: { $max: '$performedAt' },
          },
        });
        break;
      case 'target':
        pipeline.push({
          $group: {
            _id: { type: '$target.type', id: '$target.id' },
            name: { $first: '$target.name' },
            count: { $sum: 1 },
            lastActivity: { $max: '$performedAt' },
          },
        });
        break;
      case 'date':
        pipeline.push({
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$performedAt' },
            },
            count: { $sum: 1 },
            actions: { $addToSet: '$action' },
          },
        });
        break;
      default:
        pipeline.push({
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastPerformed: { $max: '$performedAt' },
            uniqueUsers: { $addToSet: '$actor.userId' },
          },
        });
    }

    // Add projection and sorting
    pipeline.push(
      {
        $project: {
          ...(groupBy === 'action' && {
            action: '$_id',
            count: 1,
            lastPerformed: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          }),
          ...(groupBy === 'actor' && {
            userId: '$_id',
            name: 1,
            email: 1,
            role: 1,
            count: 1,
            lastActivity: 1,
          }),
          ...(groupBy === 'target' && {
            targetType: '$_id.type',
            targetId: '$_id.id',
            name: 1,
            count: 1,
            lastActivity: 1,
          }),
          ...(groupBy === 'date' && {
            date: '$_id',
            count: 1,
            actions: 1,
          }),
        },
      },
      { $sort: { count: -1 } }
    );

    const summary = await Activity.aggregate(pipeline);
    
    return successResponse(res, summary, 'Activity summary retrieved successfully');
  } catch (error) {
    logger.error('Get activity summary error:', error);
    return errorResponse(res, error);
  }
};

// GET /activities/:id - Get specific activity (Admin only)
export const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return notFoundResponse(res, 'Activity');
    }

    return successResponse(res, activity, 'Activity retrieved successfully');
  } catch (error) {
    logger.error('Get activity by ID error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /activities/:id - Delete activity (Admin only)
export const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return notFoundResponse(res, 'Activity');
    }

    await Activity.findByIdAndDelete(req.params.id);

    return successResponse(res, null, 'Activity deleted successfully');
  } catch (error) {
    logger.error('Delete activity error:', error);
    return errorResponse(res, error);
  }
};

// POST /activities/bulk-delete - Bulk delete activities (Admin only)
export const bulkDeleteActivities = async (req, res) => {
  try {
    const { activityIds, filters } = req.body;

    let query = {};

    if (activityIds && activityIds.length > 0) {
      query._id = { $in: activityIds };
    } else if (filters) {
      // Apply filters for bulk deletion
      if (filters.action) query.action = filters.action;
      if (filters.actorId) query['actor.userId'] = filters.actorId;
      if (filters.targetType) query['target.type'] = filters.targetType;
      if (filters.startDate || filters.endDate) {
        query.performedAt = {};
        if (filters.startDate) query.performedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.performedAt.$lte = new Date(filters.endDate);
      }
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_CRITERIA',
          message: 'Either activityIds or filters must be provided',
        },
      });
    }

    const result = await Activity.deleteMany(query);

    return successResponse(res, { deletedCount: result.deletedCount }, 'Activities deleted successfully');
  } catch (error) {
    logger.error('Bulk delete activities error:', error);
    return errorResponse(res, error);
  }
};

// POST /activities/export - Export activities (Admin only)
export const exportActivities = async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.body;

    // Build query from filters
    const query = {};
    
    if (filters.action) query.action = filters.action;
    if (filters.actorId) query['actor.userId'] = filters.actorId;
    if (filters.actorRole) query['actor.role'] = filters.actorRole;
    if (filters.targetType) query['target.type'] = filters.targetType;
    if (filters.targetId) query['target.id'] = filters.targetId;
    if (filters.status) query.status = filters.status;
    
    if (filters.startDate || filters.endDate) {
      query.performedAt = {};
      if (filters.startDate) query.performedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.performedAt.$lte = new Date(filters.endDate);
    }

    const activities = await Activity.find(query).sort({ performedAt: -1 });

    // Log the export activity
    await ActivityService.logActivity({
      action: 'EXPORT_PERFORMED',
      actor: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      target: {
        type: 'SYSTEM',
        id: null,
        model: null,
        name: 'Activity Export',
      },
      metadata: {
        format,
        filters,
        recordCount: activities.length,
      },
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = activities.map(activity => ({
        Action: activity.action,
        Actor: activity.actor.name,
        'Actor Email': activity.actor.email,
        'Actor Role': activity.actor.role,
        'Target Type': activity.target.type,
        'Target Name': activity.target.name,
        Status: activity.status,
        'Performed At': activity.performedAt,
        Description: activity.description,
      }));

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=activities-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Convert to CSV string
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');

      return res.send(csvString);
    }

    // Default JSON format
    return successResponse(res, activities, 'Activities exported successfully');
  } catch (error) {
    logger.error('Export activities error:', error);
    return errorResponse(res, error);
  }
};

// POST /activities/cleanup - Clean up old activities (Admin only)
export const cleanupActivities = async (req, res) => {
  try {
    const { daysToKeep = 365 } = req.body;

    const deletedCount = await ActivityService.cleanupOldActivities(daysToKeep);

    // Log the cleanup activity
    await ActivityService.logActivity({
      action: 'CLEANUP_PERFORMED',
      actor: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      target: {
        type: 'SYSTEM',
        id: null,
        model: null,
        name: 'Activity Cleanup',
      },
      metadata: {
        daysToKeep,
        deletedCount,
      },
    });

    return successResponse(res, { deletedCount }, 'Activities cleaned up successfully');
  } catch (error) {
    logger.error('Cleanup activities error:', error);
    return errorResponse(res, error);
  }
};
