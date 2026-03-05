/**
 * Physical Book Routes
 * BASE: /api/books
 */

import { Router } from 'express';
import * as bookController from '../controllers/book.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', bookController.getBooks);
router.get('/:id/availability', bookController.getBookAvailability);

// ─── Public but enriched with user context when logged in ─────────────────────
router.get('/:id', protect, bookController.getBook);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.use(protect, restrictTo('ADMIN'));

router.get('/admin/list', bookController.getAdminBooks);
router.post('/', bookController.createBook);
router.patch('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

export default router;
