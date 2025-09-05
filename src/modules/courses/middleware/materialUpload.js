import multer from 'multer';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

// File type configurations
const fileTypeConfigs = {
  PDF: {
    allowedMimes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'PDF documents'
  },
  POWERPOINT: {
    allowedMimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    allowedExtensions: ['.ppt', '.pptx'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'PowerPoint presentations'
  },
  VIDEO: {
    allowedMimes: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/quicktime'
    ],
    allowedExtensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.qt'],
    maxSize: 500 * 1024 * 1024, // 500MB
    description: 'Video files'
  },
  AUDIO: {
    allowedMimes: [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'audio/aac',
      'audio/m4a'
    ],
    allowedExtensions: ['.mp3', '.wav', '.ogg', '.aac', '.m4a'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'Audio files'
  },
  IMAGE: {
    allowedMimes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Image files'
  },
  DOCUMENT: {
    allowedMimes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf'
    ],
    allowedExtensions: ['.doc', '.docx', '.txt', '.rtf'],
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Document files'
  },
  SPREADSHEET: {
    allowedMimes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ],
    allowedExtensions: ['.xls', '.xlsx', '.csv'],
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Spreadsheet files'
  },
  PRESENTATION: {
    allowedMimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ],
    allowedExtensions: ['.ppt', '.pptx', '.odp'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'Presentation files'
  },
  ARCHIVE: {
    allowedMimes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/gzip',
      'application/x-tar'
    ],
    allowedExtensions: ['.zip', '.rar', '.7z', '.gz', '.tar'],
    maxSize: 200 * 1024 * 1024, // 200MB
    description: 'Archive files'
  },
  OTHER: {
    allowedMimes: ['application/octet-stream'],
    allowedExtensions: ['.*'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Other file types'
  }
};

// Create file filter function
const createFileFilter = (materialType) => {
  return (req, file, cb) => {
    const config = fileTypeConfigs[materialType];
    
    if (!config) {
      return cb(new Error(`Invalid material type: ${materialType}`), false);
    }

    // Check MIME type
    const isValidMime = config.allowedMimes.includes(file.mimetype);
    
    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isValidExtension = config.allowedExtensions.some(ext => 
      ext === '.*' || fileExtension === ext.toLowerCase()
    );

    if (isValidMime || isValidExtension) {
      cb(null, true);
    } else {
      const error = new Error(
        `Invalid file type for ${materialType}. Allowed types: ${config.description}`
      );
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  };
};

// Create multer configuration for specific material type
export const createMaterialUpload = (materialType) => {
  const config = fileTypeConfigs[materialType];
  
  if (!config) {
    throw new Error(`Invalid material type: ${materialType}`);
  }

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxSize,
      files: 1 // Only allow one file at a time
    },
    fileFilter: createFileFilter(materialType)
  });
};

// Generic upload middleware for all material types
export const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024, // Use environment variable
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Get material type from request body or query
    const materialType = req.body.type || req.query.type;
    
    if (!materialType) {
      return cb(new Error('Material type is required'), false);
    }

    const typeConfig = fileTypeConfigs[materialType];
    if (!typeConfig) {
      return cb(new Error(`Invalid material type: ${materialType}`), false);
    }

    // Check MIME type
    const isValidMime = typeConfig.allowedMimes.includes(file.mimetype);
    
    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isValidExtension = typeConfig.allowedExtensions.some(ext => 
      ext === '.*' || fileExtension === ext.toLowerCase()
    );

    if (isValidMime || isValidExtension) {
      // Store material type in request for later use
      req.materialType = materialType;
      cb(null, true);
    } else {
      const error = new Error(
        `Invalid file type for ${materialType}. Allowed types: ${typeConfig.description}`
      );
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  }
});

// Middleware to validate file type after upload
export const validateMaterialType = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'NO_FILE',
        message: 'No file uploaded'
      }
    });
  }

  const materialType = req.body.type || req.materialType;
  
  if (!materialType) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'MISSING_TYPE',
        message: 'Material type is required'
      }
    });
  }

  const typeConfig = fileTypeConfigs[materialType];
  if (!typeConfig) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_TYPE',
        message: `Invalid material type: ${materialType}`
      }
    });
  }

  // Additional validation can be added here
  req.materialType = materialType;
  next();
};

// Get file type configuration
export const getFileTypeConfig = (materialType) => {
  return fileTypeConfigs[materialType] || null;
};

// Get all supported file types
export const getSupportedFileTypes = () => {
  return Object.keys(fileTypeConfigs).map(type => ({
    type,
    ...fileTypeConfigs[type]
  }));
};

// Error handling middleware for multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the maximum allowed limit'
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files uploaded'
        }
      });
    }
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    });
  }

  logger.error('Upload error:', error);
  next(error);
};

export default {
  createMaterialUpload,
  materialUpload,
  validateMaterialType,
  getFileTypeConfig,
  getSupportedFileTypes,
  handleUploadError
};
