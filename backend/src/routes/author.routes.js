/**
 * Author Routes
 * BASE: /api/authors
 */

import { Router } from 'express';
import * as authorController from '../controllers/author.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../utils/upload.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', authorController.getAuthors);
router.get('/:id', authorController.getAuthor);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(protect, restrictTo('ADMIN'));

router.post('/', uploadImage.single('image'), authorController.createAuthor);
router.patch('/:id', uploadImage.single('image'), authorController.updateAuthor);
router.delete('/:id', authorController.deleteAuthor);

export default router;
