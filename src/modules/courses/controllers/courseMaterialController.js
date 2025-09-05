import { CourseMaterial } from '../models/CourseMaterial.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { User } from '../../users/models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../config/cloudinary.js';
import { successResponse, errorResponse, validationErrorResponse } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const createMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  course: z.string().min(1, 'Course ID is required'),
  lesson: z.string().optional(),
  type: z.enum(['PDF', 'POWERPOINT', 'VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'ARCHIVE', 'OTHER']),
  isRequired: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().optional(),
    language: z.string().optional(),
    accessibility: z.object({
      hasTranscript: z.boolean().optional(),
      hasSubtitles: z.boolean().optional(),
      hasAudioDescription: z.boolean().optional()
    }).optional()
  }).optional()
});

const updateMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  isRequired: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().optional(),
    language: z.string().optional(),
    accessibility: z.object({
      hasTranscript: z.boolean().optional(),
      hasSubtitles: z.boolean().optional(),
      hasAudioDescription: z.boolean().optional()
    }).optional()
  }).optional()
});

// GET /course-materials - Get all course materials with filtering
export const getAllCourseMaterials = async (req, res) => {
  try {
    const {
      course,
      lesson,
      type,
      status = 'PUBLISHED',
      isRequired,
      isPublic,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (course) query.course = course;
    if (lesson) query.lesson = lesson;
    if (type) query.type = type;
    if (status) query.status = status;
    if (isRequired !== undefined) query.isRequired = isRequired === 'true';
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const materials = await CourseMaterial.find(query)
      .populate('course', 'title slug')
      .populate('lesson', 'title')
      .populate('uploadedBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CourseMaterial.countDocuments(query);

    const response = {
      materials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };

    return successResponse(res, response, 'Course materials retrieved successfully');
  } catch (error) {
    logger.error('Error getting course materials:', error);
    return errorResponse(res, error);
  }
};

// GET /course-materials/:id - Get single course material
export const getCourseMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await CourseMaterial.findById(id)
      .populate('course', 'title slug')
      .populate('lesson', 'title')
      .populate('uploadedBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!material) {
      return errorResponse(res, { message: 'Course material not found' }, 404);
    }

    // Increment view count
    await material.incrementViewCount();

    return successResponse(res, material, 'Course material retrieved successfully');
  } catch (error) {
    logger.error('Error getting course material:', error);
    return errorResponse(res, error);
  }
};

// POST /course-materials - Create new course material
export const createCourseMaterial = async (req, res) => {
  try {
    // Validate request body
    const validation = createMaterialSchema.safeParse(req.body);
    if (!validation.success) {
      return validationErrorResponse(res, validation.error.errors);
    }

    const data = validation.data;

    // Check if course exists
    const course = await Course.findById(data.course);
    if (!course) {
      return errorResponse(res, { message: 'Course not found' }, 404);
    }

    // Check if lesson exists (if provided)
    if (data.lesson) {
      const lesson = await Lesson.findById(data.lesson);
      if (!lesson) {
        return errorResponse(res, { message: 'Lesson not found' }, 404);
      }
    }

    // Handle file upload
    if (!req.file) {
      return errorResponse(res, { message: 'File is required' }, 400);
    }

    // Upload file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, 'course-materials');

    // Create course material
    const materialData = {
      ...data,
      file: {
        publicId: uploadResult.publicId,
        url: uploadResult.url,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        format: uploadResult.format
      },
      uploadedBy: req.user._id,
      lastModifiedBy: req.user._id
    };

    const material = new CourseMaterial(materialData);
    await material.save();

    // Populate the response
    await material.populate([
      { path: 'course', select: 'title slug' },
      { path: 'lesson', select: 'title' },
      { path: 'uploadedBy', select: 'name email' }
    ]);

    logger.info(`Course material created: ${material.title} by ${req.user.email}`);
    return successResponse(res, material, 'Course material created successfully', 201);
  } catch (error) {
    logger.error('Error creating course material:', error);
    return errorResponse(res, error);
  }
};

// PUT /course-materials/:id - Update course material
export const updateCourseMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateMaterialSchema.safeParse(req.body);
    if (!validation.success) {
      return validationErrorResponse(res, validation.error.errors);
    }

    const data = validation.data;

    // Find material
    const material = await CourseMaterial.findById(id);
    if (!material) {
      return errorResponse(res, { message: 'Course material not found' }, 404);
    }

    // Check permissions (only uploader or admin can update)
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, { message: 'Not authorized to update this material' }, 403);
    }

    // Handle file replacement if new file is uploaded
    if (req.file) {
      // Delete old file from Cloudinary
      await deleteFromCloudinary(material.file.publicId);

      // Upload new file
      const uploadResult = await uploadToCloudinary(req.file, 'course-materials');

      data.file = {
        publicId: uploadResult.publicId,
        url: uploadResult.url,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        format: uploadResult.format
      };
    }

    // Update material
    data.lastModifiedBy = req.user._id;
    const updatedMaterial = await CourseMaterial.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    ).populate([
      { path: 'course', select: 'title slug' },
      { path: 'lesson', select: 'title' },
      { path: 'uploadedBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' }
    ]);

    logger.info(`Course material updated: ${updatedMaterial.title} by ${req.user.email}`);
    return successResponse(res, updatedMaterial, 'Course material updated successfully');
  } catch (error) {
    logger.error('Error updating course material:', error);
    return errorResponse(res, error);
  }
};

// DELETE /course-materials/:id - Delete course material
export const deleteCourseMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await CourseMaterial.findById(id);
    if (!material) {
      return errorResponse(res, { message: 'Course material not found' }, 404);
    }

    // Check permissions (only uploader or admin can delete)
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, { message: 'Not authorized to delete this material' }, 403);
    }

    // Delete file from Cloudinary
    await deleteFromCloudinary(material.file.publicId);

    // Delete thumbnail if exists
    if (material.thumbnail?.publicId) {
      await deleteFromCloudinary(material.thumbnail.publicId);
    }

    // Delete from database
    await CourseMaterial.findByIdAndDelete(id);

    logger.info(`Course material deleted: ${material.title} by ${req.user.email}`);
    return successResponse(res, null, 'Course material deleted successfully');
  } catch (error) {
    logger.error('Error deleting course material:', error);
    return errorResponse(res, error);
  }
};

// GET /course-materials/course/:courseId - Get materials by course
export const getMaterialsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lesson, type, status = 'PUBLISHED' } = req.query;

    const options = { lessonId: lesson, type };
    const materials = await CourseMaterial.getByCourse(courseId, options);

    return successResponse(res, materials, 'Course materials retrieved successfully');
  } catch (error) {
    logger.error('Error getting materials by course:', error);
    return errorResponse(res, error);
  }
};

// GET /course-materials/type/:type - Get materials by type
export const getMaterialsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { courseId } = req.query;

    const options = { courseId };
    const materials = await CourseMaterial.getByType(type, options);

    return successResponse(res, materials, 'Materials by type retrieved successfully');
  } catch (error) {
    logger.error('Error getting materials by type:', error);
    return errorResponse(res, error);
  }
};

// POST /course-materials/:id/download - Track download
export const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await CourseMaterial.findById(id);
    if (!material) {
      return errorResponse(res, { message: 'Course material not found' }, 404);
    }

    // Increment download count
    await material.incrementDownloadCount();

    return successResponse(res, { 
      downloadCount: material.downloadCount,
      downloadUrl: material.file.url 
    }, 'Download tracked successfully');
  } catch (error) {
    logger.error('Error tracking download:', error);
    return errorResponse(res, error);
  }
};

// GET /course-materials/stats - Get material statistics
export const getMaterialStats = async (req, res) => {
  try {
    const stats = await CourseMaterial.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$file.size' },
          totalViews: { $sum: '$viewCount' },
          totalDownloads: { $sum: '$downloadCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalMaterials = await CourseMaterial.countDocuments();
    const totalSize = await CourseMaterial.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$file.size' } } }
    ]);

    const response = {
      totalMaterials,
      totalSize: totalSize[0]?.totalSize || 0,
      byType: stats
    };

    return successResponse(res, response, 'Material statistics retrieved successfully');
  } catch (error) {
    logger.error('Error getting material stats:', error);
    return errorResponse(res, error);
  }
};

// Export validation schemas for use in routes
export { createMaterialSchema, updateMaterialSchema };
