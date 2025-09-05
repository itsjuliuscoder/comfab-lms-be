import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Course materials specific upload configurations
const materialTypeConfigs = {
  PDF: {
    folder: 'course-materials/pdfs',
    resource_type: 'raw',
    allowed_formats: ['pdf'],
    transformation: []
  },
  POWERPOINT: {
    folder: 'course-materials/presentations',
    resource_type: 'raw',
    allowed_formats: ['ppt', 'pptx'],
    transformation: []
  },
  VIDEO: {
    folder: 'course-materials/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  },
  AUDIO: {
    folder: 'course-materials/audio',
    resource_type: 'video', // Cloudinary treats audio as video
    allowed_formats: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  },
  IMAGE: {
    folder: 'course-materials/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  },
  DOCUMENT: {
    folder: 'course-materials/documents',
    resource_type: 'raw',
    allowed_formats: ['doc', 'docx', 'txt', 'rtf'],
    transformation: []
  },
  SPREADSHEET: {
    folder: 'course-materials/spreadsheets',
    resource_type: 'raw',
    allowed_formats: ['xls', 'xlsx', 'csv'],
    transformation: []
  },
  PRESENTATION: {
    folder: 'course-materials/presentations',
    resource_type: 'raw',
    allowed_formats: ['ppt', 'pptx', 'odp'],
    transformation: []
  },
  ARCHIVE: {
    folder: 'course-materials/archives',
    resource_type: 'raw',
    allowed_formats: ['zip', 'rar', '7z', 'gz', 'tar'],
    transformation: []
  },
  OTHER: {
    folder: 'course-materials/other',
    resource_type: 'auto',
    allowed_formats: ['*'],
    transformation: []
  }
};

// Upload course material to Cloudinary
export const uploadCourseMaterial = async (file, materialType, options = {}) => {
  try {
    const typeConfig = materialTypeConfigs[materialType];
    
    if (!typeConfig) {
      throw new Error(`Invalid material type: ${materialType}`);
    }

    // Prepare upload options
    const uploadOptions = {
      folder: typeConfig.folder,
      resource_type: typeConfig.resource_type,
      allowed_formats: typeConfig.allowed_formats,
      transformation: typeConfig.transformation,
      public_id: options.publicId || undefined,
      overwrite: options.overwrite || false,
      use_filename: true,
      unique_filename: true,
      ...options
    };

    // Add specific options based on material type
    if (materialType === 'VIDEO' || materialType === 'AUDIO') {
      uploadOptions.eager = [
        { width: 640, height: 360, crop: 'scale', format: 'jpg' }
      ];
      uploadOptions.eager_async = true;
    }

    if (materialType === 'IMAGE') {
      uploadOptions.eager = [
        { width: 300, height: 200, crop: 'scale', format: 'jpg' },
        { width: 600, height: 400, crop: 'scale', format: 'jpg' }
      ];
      uploadOptions.eager_async = true;
    }

    // Upload file
    const result = await cloudinary.uploader.upload(file.path || file.buffer, uploadOptions);

    // Generate thumbnail for videos and images
    let thumbnail = null;
    if (materialType === 'VIDEO' || materialType === 'IMAGE') {
      try {
        const thumbnailResult = await cloudinary.uploader.upload(
          file.path || file.buffer,
          {
            folder: `${typeConfig.folder}/thumbnails`,
            resource_type: materialType === 'VIDEO' ? 'video' : 'image',
            transformation: [
              { width: 300, height: 200, crop: 'scale' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ],
            public_id: `${result.public_id}_thumbnail`
          }
        );
        
        thumbnail = {
          publicId: thumbnailResult.public_id,
          url: thumbnailResult.secure_url
        };
      } catch (thumbnailError) {
        logger.warn('Failed to generate thumbnail:', thumbnailError);
      }
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      thumbnail
    };

  } catch (error) {
    logger.error('Course material upload error:', error);
    throw new Error(`Failed to upload course material: ${error.message}`);
  }
};

// Delete course material from Cloudinary
export const deleteCourseMaterial = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    if (result.result !== 'ok') {
      throw new Error(`Failed to delete file: ${result.result}`);
    }

    return result;
  } catch (error) {
    logger.error('Course material deletion error:', error);
    throw new Error(`Failed to delete course material: ${error.message}`);
  }
};

// Generate optimized URL for course material
export const getOptimizedUrl = (publicId, materialType, options = {}) => {
  try {
    const typeConfig = materialTypeConfigs[materialType];
    
    if (!typeConfig) {
      throw new Error(`Invalid material type: ${materialType}`);
    }

    const transformationOptions = {
      secure: true,
      ...options
    };

    // Add type-specific transformations
    if (materialType === 'VIDEO') {
      transformationOptions.quality = 'auto:good';
      transformationOptions.fetch_format = 'auto';
    } else if (materialType === 'IMAGE') {
      transformationOptions.quality = 'auto:good';
      transformationOptions.fetch_format = 'auto';
    }

    return cloudinary.url(publicId, {
      resource_type: typeConfig.resource_type,
      ...transformationOptions
    });
  } catch (error) {
    logger.error('Error generating optimized URL:', error);
    throw new Error(`Failed to generate optimized URL: ${error.message}`);
  }
};

// Generate thumbnail URL
export const getThumbnailUrl = (publicId, materialType, options = {}) => {
  try {
    const typeConfig = materialTypeConfigs[materialType];
    
    if (!typeConfig) {
      throw new Error(`Invalid material type: ${materialType}`);
    }

    const thumbnailOptions = {
      width: options.width || 300,
      height: options.height || 200,
      crop: 'scale',
      quality: 'auto:good',
      fetch_format: 'auto',
      secure: true,
      ...options
    };

    return cloudinary.url(publicId, {
      resource_type: typeConfig.resource_type,
      transformation: [thumbnailOptions]
    });
  } catch (error) {
    logger.error('Error generating thumbnail URL:', error);
    throw new Error(`Failed to generate thumbnail URL: ${error.message}`);
  }
};

// Get file information from Cloudinary
export const getFileInfo = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      createdAt: result.created_at
    };
  } catch (error) {
    logger.error('Error getting file info:', error);
    throw new Error(`Failed to get file info: ${error.message}`);
  }
};

// Generate download URL with expiration
export const getDownloadUrl = (publicId, materialType, expiresIn = 3600) => {
  try {
    const typeConfig = materialTypeConfigs[materialType];
    
    if (!typeConfig) {
      throw new Error(`Invalid material type: ${materialType}`);
    }

    return cloudinary.url(publicId, {
      resource_type: typeConfig.resource_type,
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
  } catch (error) {
    logger.error('Error generating download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
};

// Bulk delete course materials
export const bulkDeleteCourseMaterials = async (publicIds, resourceType = 'auto') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });

    return result;
  } catch (error) {
    logger.error('Error bulk deleting course materials:', error);
    throw new Error(`Failed to bulk delete course materials: ${error.message}`);
  }
};

// Get storage usage statistics
export const getStorageStats = async () => {
  try {
    const result = await cloudinary.api.usage();
    
    return {
      plan: result.plan,
      objects: result.objects,
      bandwidth: result.bandwidth,
      storage: result.storage,
      requests: result.requests,
      resources: result.resources,
      derived_resources: result.derived_resources
    };
  } catch (error) {
    logger.error('Error getting storage stats:', error);
    throw new Error(`Failed to get storage stats: ${error.message}`);
  }
};

export default {
  uploadCourseMaterial,
  deleteCourseMaterial,
  getOptimizedUrl,
  getThumbnailUrl,
  getFileInfo,
  getDownloadUrl,
  bulkDeleteCourseMaterials,
  getStorageStats
};
