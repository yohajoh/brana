import express from "express";
import * as authController from "../controllers/auth.controller.js";
import * as authService from "../services/auth.service.js";
import { body } from "express-validator";
import passport from "passport";
import { generateToken, getAuthCookieOptions } from "../utils/token.utils.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const router = express.Router();

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

// Password reset — these were previously missing
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// Calendar redirect URI must match exactly what is registered in Google Cloud Console
// Use CALENDAR_CALLBACK_URL for the dedicated calendar connect flow.
// Do NOT fall back to CALLBACK_URL — that is the login redirect, not the calendar redirect.
const calendarRedirectUri = process.env.CALENDAR_CALLBACK_URL || undefined;

// Use consistent env var names — support both GOOGLE_CLIENT_ID and CLIENT_ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

const calendarOAuthClient =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, calendarRedirectUri)
    : null;
const calendarStateSecret = String(process.env.JWT_SECRET || "fallback_secret");
const signCalendarState = (userId) =>
  jwt.sign({ sub: userId, purpose: "calendar_connect" }, calendarStateSecret, {
    expiresIn: "10m",
  });
const verifyCalendarState = (token) => jwt.verify(token, calendarStateSecret);

// Google OAuth - basic login only (profile + email)
router.get("/google", (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/auth/login?error=google_not_configured`);
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

// Use passport's callback handler
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user) => {
    if (err) {
      console.error("Google Auth callback error:", err);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_callback_error`);
    }

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_auth_failed`);
    }

    try {
      const context = await authService.resolveUserSessionContext(user.id);
      const token = generateToken(context.sessionPayload);
      /** @type {import('express').CookieOptions} */
      const cookieOptions = {
        ...getAuthCookieOptions(),
        expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
      };
      res.cookie("token", token, cookieOptions);

      const needsProfileCompletion =
        context.sessionPayload.activePersona === "STUDENT" &&
        (!context.user.student_id || !context.user.phone || !context.user.year || !context.user.department);
      const redirectPath = needsProfileCompletion
        ? "/auth/complete-profile"
        : context.sessionPayload.activePersona === "ADMIN"
          ? "/dashboard/admin"
          : "/dashboard/student";

      return res.redirect(`${FRONTEND_URL}${redirectPath}`);
    } catch (callbackError) {
      console.error("Google Auth callback error:", callbackError);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_callback_error`);
    }
  })(req, res, next);
});

// Google Calendar connect flow for existing accounts
router.get("/google-calendar", protect, (req, res) => {
  if (!calendarOAuthClient) {
    return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_not_configured`);
  }

  const state = signCalendarState(req.user.id);
  const authUrl = calendarOAuthClient.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });
  return res.redirect(authUrl);
});

router.get("/google-calendar/callback", async (req, res) => {
  if (!calendarOAuthClient) {
    return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_not_configured`);
  }

  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_calendar_missing_code`);
  }

  let decoded;
  try {
    decoded = verifyCalendarState(String(state));
  } catch {
    return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_calendar_state_invalid`);
  }

  if (!decoded?.sub || decoded?.purpose !== "calendar_connect") {
    return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_calendar_state_invalid`);
  }

  try {
    const { tokens } = await calendarOAuthClient.getToken(String(code));
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, google_refresh_token: true, email: true },
    });

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_calendar_user_missing`);
    }

    const refreshToken = tokens.refresh_token || user.google_refresh_token || null;

    if (!refreshToken) {
      return res.redirect(`${FRONTEND_URL}/dashboard/student?error=google_calendar_no_refresh_token`);
    }

    // Fetch the actual Google account email that granted the permission.
    // This may differ from the user's library profile email if they authorized
    // with a different Google account — we should store the real calendar account email.
    let calendarEmail = user.email; // fallback to profile email
    try {
      calendarOAuthClient.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: calendarOAuthClient });
      const { data: googleProfile } = await oauth2.userinfo.get();
      if (googleProfile.email) {
        calendarEmail = googleProfile.email;
      }
    } catch (profileErr) {
      console.warn("Could not fetch Google profile email, using profile email as fallback:", profileErr?.message);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        google_refresh_token: refreshToken,
        google_calendar_email: calendarEmail,
        google_calendar_connected_at: new Date(),
      },
    });

    return res.redirect(`${FRONTEND_URL}/dashboard/student/settings?calendar=connected`);
  } catch (error) {
    console.error("Google Calendar connect error:", error);
    return res.redirect(`${FRONTEND_URL}/dashboard/student/settings?error=google_calendar_callback_error`);
  }
});

// Returns calendar connection status for the authenticated user
router.get("/calendar-status", protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        google_calendar_email: true,
        google_calendar_connected_at: true,
        google_refresh_token: true,
      },
    });

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    return res.status(200).json({
      status: "success",
      data: {
        connected: Boolean(user.google_refresh_token),
        email: user.google_calendar_email || null,
        connected_at: user.google_calendar_connected_at || null,
      },
    });
  } catch (error) {
    console.error("Calendar status error:", error);
    return res.status(500).json({ status: "error", message: "Failed to fetch calendar status" });
  }
});

// Disconnect Google Calendar
router.post("/calendar-disconnect", protect, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        google_refresh_token: null,
        google_calendar_email: null,
        google_calendar_connected_at: null,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    console.error("Calendar disconnect error:", error);
    return res.status(500).json({ status: "error", message: "Failed to disconnect calendar" });
  }
});

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

router.use(protect);
router.use(restrictTo("ADMIN"));

router.get("/users", authController.getAllUsers);
router.delete("/users/:id", authController.deleteUser);
router.patch("/users/:id/block", authController.blockUser);
router.patch("/users/:id/unblock", authController.unblockUser);
router.patch("/users/:id/promote-admin", authController.promoteStudentToAdmin);
router.patch("/users/:id/convert-student", authController.convertAdminToStudent);
router.patch("/users/:id/transfer-super-admin", authController.transferSuperAdmin);

export default router;
