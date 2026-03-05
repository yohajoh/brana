/**
 * Notification Routes
 * BASE: /api/notifications
 */

import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(protect);

// ─── Student + Admin: My notifications ───────────────────────────────────────
router.get('/mine', notificationController.getMyNotifications);        // Paginated, filterable
router.patch('/mine/read-all', notificationController.markAllAsRead);  // Mark all as read
router.delete('/mine/read', notificationController.deleteAllRead);     // Clear read notifications
router.patch('/:id/read', notificationController.markAsRead);          // Mark single as read
router.delete('/:id', notificationController.deleteNotification);      // Delete one

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(restrictTo('ADMIN'));

router.get('/', notificationController.getAllNotifications);            // All notifications
router.post('/broadcast', notificationController.broadcastNotification); // Blast to all users

export default router;
