/**
 * Category Routes
 * BASE: /api/categories
 */

import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', categoryController.getCategories);
router.get('/:slugOrId', categoryController.getCategory); // accepts UUID or slug

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(protect, restrictTo('ADMIN'));

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
