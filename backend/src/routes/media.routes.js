import { Router } from 'express';
import { uploadFiles, proxyImage } from '../controllers/media.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../utils/upload.js';

const router = Router();

// Public image proxy endpoint with automatic fallback for unreachable Cloudinary URLs
router.get('/image-proxy', proxyImage);

router.use(protect, restrictTo('ADMIN'));

// POST /api/media/upload?folder=brana/physical-books/covers
// field name: "files" (up to 10 images)
router.post('/upload', uploadImage.array('files', 10), uploadFiles);

export default router;
