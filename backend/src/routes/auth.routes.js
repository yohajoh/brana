import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { body } from "express-validator";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const router = express.Router();

// Public auth endpoints
router.post(
  "/signup",
  authLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("student_id").notEmpty().withMessage("Student ID is required"),
    body("year").notEmpty().withMessage("Year is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  authController.signup,
);

router.get("/confirm-email/:token", authController.confirmEmail);
router.post("/login", authLimiter, authController.login);
router.get("/logout", authController.logout);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth & Calendar endpoints
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);
router.get("/google-calendar", protect, authController.googleCalendarAuth);
router.get("/google-calendar/callback", authController.googleCalendarCallback);
router.get("/calendar-status", protect, authController.getCalendarStatus);
router.post("/calendar-disconnect", protect, authController.disconnectCalendar);

// Authenticated user endpoints
router.get("/me", protect, authController.getMe);
router.patch("/persona", protect, authController.switchPersona);
router.patch(
  "/update-me",
  protect,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("phone").optional(),
    body("year").optional(),
    body("department").optional(),
  ],
  authController.updateMe,
);
router.patch(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  authController.updatePassword,
);
router.delete("/delete-me", protect, authController.deleteUser);

// Admin-only user management endpoints
router.get("/users", protect, restrictTo("ADMIN"), authController.getAllUsers);
router.delete("/users/:id", protect, restrictTo("ADMIN"), authController.deleteUser);
router.patch("/users/:id/block", protect, restrictTo("ADMIN"), authController.blockUser);
router.patch("/users/:id/unblock", protect, restrictTo("ADMIN"), authController.unblockUser);
router.patch("/users/:id/promote-admin", protect, restrictTo("ADMIN"), authController.promoteStudentToAdmin);
router.patch("/users/:id/convert-student", protect, restrictTo("ADMIN"), authController.convertAdminToStudent);
router.patch("/users/:id/transfer-super-admin", protect, restrictTo("ADMIN"), authController.transferSuperAdmin);

export default router;
