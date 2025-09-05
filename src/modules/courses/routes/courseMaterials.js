import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  getAllCourseMaterials,
  getCourseMaterial,
  createCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterial,
  getMaterialsByCourse,
  getMaterialsByType,
  trackDownload,
  getMaterialStats,
  createMaterialSchema,
  updateMaterialSchema
} from '../controllers/courseMaterialController.js';
import {
  materialUpload,
  validateMaterialType,
  handleUploadError,
  getSupportedFileTypes
} from '../middleware/materialUpload.js';

const router = express.Router();

// Validation schemas
const materialIdSchema = z.object({
  id: z.string().min(1, 'Material ID is required')
});

const courseIdSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required')
});

const typeSchema = z.object({
  type: z.enum(['PDF', 'POWERPOINT', 'VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'ARCHIVE', 'OTHER'])
});

const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  course: z.string().optional(),
  lesson: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  isRequired: z.string().transform(val => val === 'true').optional(),
  isPublic: z.string().transform(val => val === 'true').optional()
});

// GET /course-materials/supported-types - Get supported file types
router.get('/supported-types', asyncHandler(async (req, res) => {
  const supportedTypes = getSupportedFileTypes();
  return res.json({
    ok: true,
    data: supportedTypes,
    message: 'Supported file types retrieved successfully'
  });
}));

// GET /course-materials - Get all course materials with filtering
router.get(
  '/',
  requireAuth,
  validateQuery(querySchema),
  asyncHandler(getAllCourseMaterials)
);

// GET /course-materials/stats - Get material statistics (Admin only)
router.get(
  '/stats',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  asyncHandler(getMaterialStats)
);

// GET /course-materials/course/:courseId - Get materials by course
router.get(
  '/course/:courseId',
  requireAuth,
  validateParams(courseIdSchema),
  validateQuery(z.object({
    lesson: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional()
  })),
  asyncHandler(getMaterialsByCourse)
);

// GET /course-materials/type/:type - Get materials by type
router.get(
  '/type/:type',
  requireAuth,
  validateParams(typeSchema),
  validateQuery(z.object({
    courseId: z.string().optional()
  })),
  asyncHandler(getMaterialsByType)
);

// GET /course-materials/:id - Get single course material
router.get(
  '/:id',
  requireAuth,
  validateParams(materialIdSchema),
  asyncHandler(getCourseMaterial)
);

// POST /course-materials - Create new course material
router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  materialUpload.single('file'),
  validateMaterialType,
  validateBody(createMaterialSchema),
  handleUploadError,
  asyncHandler(createCourseMaterial)
);

// PUT /course-materials/:id - Update course material
router.put(
  '/:id',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  materialUpload.single('file'),
  validateMaterialType,
  validateParams(materialIdSchema),
  validateBody(updateMaterialSchema),
  handleUploadError,
  asyncHandler(updateCourseMaterial)
);

// DELETE /course-materials/:id - Delete course material
router.delete(
  '/:id',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  validateParams(materialIdSchema),
  asyncHandler(deleteCourseMaterial)
);

// POST /course-materials/:id/download - Track download
router.post(
  '/:id/download',
  requireAuth,
  validateParams(materialIdSchema),
  asyncHandler(trackDownload)
);

// Bulk operations routes
// POST /course-materials/bulk-upload - Bulk upload materials
router.post(
  '/bulk-upload',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  materialUpload.array('files', 10), // Allow up to 10 files
  asyncHandler(async (req, res) => {
    // This would be implemented for bulk uploads
    return res.status(501).json({
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Bulk upload feature is not yet implemented'
      }
    });
  })
);

// PUT /course-materials/bulk-update - Bulk update materials
router.put(
  '/bulk-update',
  requireAuth,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  validateBody(z.object({
    materialIds: z.array(z.string()).min(1, 'At least one material ID is required'),
    updates: z.object({
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
      isRequired: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      tags: z.array(z.string()).optional()
    })
  })),
  asyncHandler(async (req, res) => {
    // This would be implemented for bulk updates
    return res.status(501).json({
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Bulk update feature is not yet implemented'
      }
    });
  })
);

// DELETE /course-materials/bulk-delete - Bulk delete materials
router.delete(
  '/bulk-delete',
  requireAuth,
  requireRole(['ADMIN']),
  validateBody(z.object({
    materialIds: z.array(z.string()).min(1, 'At least one material ID is required')
  })),
  asyncHandler(async (req, res) => {
    // This would be implemented for bulk deletes
    return res.status(501).json({
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Bulk delete feature is not yet implemented'
      }
    });
  })
);

export default router;
