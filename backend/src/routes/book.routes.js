/**
 * Physical Book Routes
 * BASE: /api/books
 */

import { Router } from 'express';
import * as bookController from '../controllers/book.controller.js';
import { optionalProtect, protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../utils/upload.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', bookController.getBooks);
router.get('/:id/availability', bookController.getBookAvailability);
router.get('/:id/copies', protect, restrictTo('ADMIN'), bookController.getBookCopies);
router.get('/:id/page-data', optionalProtect, bookController.getBookPageData);

// ─── Public but enriched with user context when logged in ─────────────────────
router.get('/:id', optionalProtect, bookController.getBook);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.use(protect, restrictTo('ADMIN'));

router.get('/admin/list', bookController.getAdminBooks);
router.post(
  '/',
  uploadImage.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  bookController.createBook,
);
router.patch(
  '/:id',
  uploadImage.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  bookController.updateBook,
);
router.delete('/:id', bookController.deleteBook);
router.patch('/copies/:copyId/condition', bookController.updateBookCopyCondition);
router.get('/copies/:copyId/condition-history', bookController.getBookCopyConditionHistory);

export default router;
