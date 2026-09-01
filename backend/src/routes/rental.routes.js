/**
 * Rental Routes
 * BASE: /api/rentals
 */

import { Router } from "express";
import * as rentalController from "../controllers/rental.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();

// All rental routes require authentication
router.use(protect);

// ─── Student routes ───────────────────────────────────────────────────────────
router.get("/mine", restrictTo("STUDENT"), rentalController.getMyRentals); // Student: my rental history
router.post("/borrow", restrictTo("STUDENT"), rentalController.borrowBook); // Student: borrow a book

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/", restrictTo("ADMIN"), rentalController.getAllRentals); // Admin: all rentals (filterable)
router.get("/admin/overdue", restrictTo("ADMIN"), rentalController.getOverdueRentals); // Admin: overdue list + estimated fines
router.get("/admin/overdue-ranking", restrictTo("ADMIN"), rentalController.getOverdueRanking);
router.post("/admin/send-reminders", restrictTo("ADMIN"), rentalController.sendOverdueReminders); // Admin: blast overdue reminders

router.patch("/:id/return", restrictTo("ADMIN"), rentalController.returnBook); // Admin: process return
router.patch("/:id/extend", restrictTo("ADMIN"), rentalController.extendRental); // Admin: extend due date
router.patch("/:id/settle-fine", restrictTo("ADMIN"), rentalController.settleRentalFine); // Admin: settle pending fine at desk
router.patch("/:id/verify-pickup", restrictTo("ADMIN"), rentalController.verifyPickupCode); // Admin: verify pickup code & issue book
router.patch("/:id/cancel-pickup", restrictTo("ADMIN"), rentalController.cancelPendingPickup); // Admin: cancel pickup & release copy

// ─── Shared single rental route (place last) ───────────────────────────────────
router.get("/:id", rentalController.getRental); // Student/Admin: get single rental

export default router;

