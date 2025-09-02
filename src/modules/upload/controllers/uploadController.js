import multer from 'multer';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../config/cloudinary.js';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images, videos, and documents
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/flv',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter,
});

// POST /upload - Generic file upload
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
    }

    // Create a temporary file object for Cloudinary
    const fileObj = {
      path: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    };

    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileObj, 'uploads');

    const fileData = {
      id: result.publicId,
      url: result.url,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      format: result.format,
      publicId: result.publicId,
    };

    return successResponse(res, { file: fileData }, 'File uploaded successfully', 201);
  } catch (error) {
    logger.error('File upload error:', error);
    return errorResponse(res, error);
  }
};

// POST /upload/image - Image upload
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No image uploaded',
        },
      });
    }

    // Check if it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only image files are allowed',
        },
      });
    }

    // Create a temporary file object for Cloudinary
    const fileObj = {
      path: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    };

    // Upload to Cloudinary with image-specific settings
    const result = await uploadToCloudinary(fileObj, 'images');

    const imageData = {
      id: result.publicId,
      url: result.url,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      format: result.format,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    };

    return successResponse(res, { image: imageData }, 'Image uploaded successfully', 201);
  } catch (error) {
    logger.error('Image upload error:', error);
    return errorResponse(res, error);
  }
};

// POST /upload/video - Video upload
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No video uploaded',
        },
      });
    }

    // Check if it's a video
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only video files are allowed',
        },
      });
    }

    // Create a temporary file object for Cloudinary
    const fileObj = {
      path: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    };

    // Upload to Cloudinary with video-specific settings
    const result = await uploadToCloudinary(fileObj, 'videos');

    const videoData = {
      id: result.publicId,
      url: result.url,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      format: result.format,
      publicId: result.publicId,
      duration: result.duration,
      width: result.width,
      height: result.height,
    };

    return successResponse(res, { video: videoData }, 'Video uploaded successfully', 201);
  } catch (error) {
    logger.error('Video upload error:', error);
    return errorResponse(res, error);
  }
};

// POST /upload/document - Document upload
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_FILE',
          message: 'No document uploaded',
        },
      });
    }

    // Check if it's a document
    const documentMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (!documentMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only document files are allowed',
        },
      });
    }

    // Create a temporary file object for Cloudinary
    const fileObj = {
      path: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    };

    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileObj, 'documents');

    const documentData = {
      id: result.publicId,
      url: result.url,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      format: result.format,
      publicId: result.publicId,
    };

    return successResponse(res, { document: documentData }, 'Document uploaded successfully', 201);
  } catch (error) {
    logger.error('Document upload error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /upload/:id - Delete uploaded file
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FILE_ID',
          message: 'File ID is required',
        },
      });
    }

    // Delete from Cloudinary
    const result = await deleteFromCloudinary(id);

    if (!result) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    return successResponse(res, null, 'File deleted successfully');
  } catch (error) {
    logger.error('Delete file error:', error);
    return errorResponse(res, error);
  }
};

// Export multer middleware for use in routes
export { upload };
