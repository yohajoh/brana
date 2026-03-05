/**
 * Admin Stats Routes
 * BASE: /api/stats
 * All routes restricted to ADMIN only.
 */

import { Router } from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('ADMIN'));

router.get('/overview', statsController.getOverviewStats);  // KPI dashboard cards
router.get('/books', statsController.getBooksStats);        // Book rankings, stock alerts
router.get('/users', statsController.getUserStats);         // Active users, top borrowers
router.get('/rentals', statsController.getRentalStats);     // Rental status, time-series
router.get('/revenue', statsController.getRevenueStats);    // Revenue by method, monthly chart

export default router;
