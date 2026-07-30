/**
 * Media Routes  –  BASE: /api/media
 * Admin-only pre-upload endpoint used by the dashboard modals.
 */

import { Router } from 'express';
import { uploadFiles } from '../controllers/media.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../utils/upload.js';

const router = Router();

router.use(protect, restrictTo('ADMIN'));

// POST /api/media/upload?folder=brana/physical-books/covers
// field name: "files" (up to 10 images)
router.post('/upload', uploadImage.array('files', 10), uploadFiles);

export default router;
