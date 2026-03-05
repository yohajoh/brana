/**
 * Review Routes
 * BASE: /api/reviews
 *
 * Reviews are scoped to a book: /:bookType/:bookId/reviews
 *   bookType: physical | digital
 *   bookId:   UUID of the book
 */

import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Admin: all reviews ───────────────────────────────────────────────────────
router.get('/admin/all', protect, restrictTo('ADMIN'), reviewController.getAllReviews);

// ─── Public: list reviews and rating summary for a book ──────────────────────
// GET /api/reviews/:bookType/:bookId  – e.g. /api/reviews/physical/abc-123
router.get('/:bookType/:bookId', reviewController.getReviews);

// ─── Protected: user-specific review ─────────────────────────────────────────
router.get('/:bookType/:bookId/mine', protect, reviewController.getMyReview);
router.post('/:bookType/:bookId', protect, reviewController.createReview);

// ─── Protected: manage a specific review by its own ID ───────────────────────
router.patch('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

export default router;
