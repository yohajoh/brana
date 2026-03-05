/**
 * Digital Book Routes
 * BASE: /api/digital-books
 */

import { Router } from 'express';
import * as digitalBookController from '../controllers/digitalBook.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadPdf } from '../utils/upload.js';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', digitalBookController.getDigitalBooks);
router.get('/:id', digitalBookController.getDigitalBook);

// ─── Protected (any authenticated user) ──────────────────────────────────────
router.get('/:id/pdf', protect, digitalBookController.streamPdf);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(protect, restrictTo('ADMIN'));

router.get('/admin/list', digitalBookController.getAdminDigitalBooks);
router.post('/', uploadPdf.single('pdf'), digitalBookController.createDigitalBook);
router.patch('/:id', uploadPdf.single('pdf'), digitalBookController.updateDigitalBook);
router.delete('/:id', digitalBookController.deleteDigitalBook);

export default router;
