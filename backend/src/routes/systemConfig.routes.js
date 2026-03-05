/**
 * System Config Routes
 * BASE: /api/config
 */

import { Router } from 'express';
import * as systemConfigController from '../controllers/systemConfig.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// Public: read current config (students need max_loan_days displayed in UI)
router.get('/', systemConfigController.getConfig);

// Admin only: update config
router.patch('/', protect, restrictTo('ADMIN'), systemConfigController.updateConfig);

// Admin: initial setup (same as PATCH, just alias for clarity)
router.post('/setup', protect, restrictTo('ADMIN'), systemConfigController.updateConfig);

export default router;
