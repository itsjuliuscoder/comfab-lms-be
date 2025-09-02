import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/error.js';
import {
  uploadFile,
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFile,
  upload,
} from '../controllers/uploadController.js';

const router = express.Router();

// File Upload Routes (all require authentication)
router.post('/', requireAuth, upload.single('file'), asyncHandler(uploadFile));
router.post('/image', requireAuth, upload.single('image'), asyncHandler(uploadImage));
router.post('/video', requireAuth, upload.single('video'), asyncHandler(uploadVideo));
router.post('/document', requireAuth, upload.single('document'), asyncHandler(uploadDocument));
router.delete('/:id', requireAuth, asyncHandler(deleteFile));

export default router;
