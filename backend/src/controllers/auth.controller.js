import { prisma } from "../prisma.js";
import * as authService from "../services/auth.service.js";
import { AppError } from "../middlewares/error.middleware.js";
import { generateToken, getAuthCookieOptions, sendTokenCookie } from "../utils/token.utils.js";
import { validationResult } from "express-validator";
import { logAdminActivity } from "../services/adminActivity.service.js";
import { invalidateAuthUserCache } from "../middlewares/auth.middleware.js";
import passport from "passport";
import { google } from "googleapis";
import jwt from "jsonwebtoken";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const calendarRedirectUri = process.env.CALENDAR_CALLBACK_URL || undefined;

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


export const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError("Validation failed", 400));
  }

  try {
    const user = await authService.signup(req.body);
    res.status(201).json({
      status: "success",
      message: "User registered successfully. Please check your email to confirm your account.",
      data: { user },
    });
  } catch (error) {
    console.error("Signup error:", error?.message || error);
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return next(new AppError("Database setup incomplete. Please run: pnpm prisma db push", 500));
    }
    next(error);
  }
};

export const confirmEmail = async (req, res, next) => {
  try {
    await authService.confirmEmail(req.params.token);
    res.status(200).json({
      status: "success",
      message: "Email confirmed successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    const context = await authService.resolveUserSessionContext(user.id);
    sendTokenCookie(context.user, 200, res, context.sessionPayload);
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.cookie("token", "none", {
    ...getAuthCookieOptions(),
    expires: new Date(Date.now() + 10 * 1000),
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user = await authService.resetPassword(req.params.token, req.body.password);
    sendTokenCookie(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError("You are not logged in! Please log in to get access.", 401);
    }

    const roles = Array.isArray(req.authContext?.roles) ? req.authContext.roles : [req.user.role];
    const activePersona = req.authContext?.activePersona || (roles.includes("ADMIN") ? "ADMIN" : "STUDENT");
    const studentProfileId = req.authContext?.studentProfileId || null;

    const user = {
      ...req.user,
      roles,
      activePersona,
      studentProfileId,
      is_super_admin: roles.includes("SUPER_ADMIN") || Boolean(req.user?.is_super_admin),
    };

    res.status(200).json({
      status: "success",
      data: {
        user,
        session: {
          roles,
          activePersona,
          studentProfileId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const switchPersona = async (req, res, next) => {
  try {
    const requestedPersona = String(req.body?.activePersona || "").toUpperCase();
    if (!["ADMIN", "STUDENT"].includes(requestedPersona)) {
      throw new AppError("activePersona must be ADMIN or STUDENT", 400);
    }

    const context = await authService.resolveUserSessionContext(req.user.id, requestedPersona);
    if (!context.sessionPayload.roles.includes(requestedPersona)) {
      throw new AppError("You do not have this persona", 403);
    }

    if (requestedPersona !== req.authContext?.activePersona) {
      await logAdminActivity({
        adminUserId: req.user.id,
        action: "PERSONA_SWITCH",
        entityType: "USER",
        entityId: req.user.id,
        description: `Switched active persona to ${requestedPersona}`,
        metadata: { activePersona: requestedPersona },
        req,
      });
    }

    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    sendTokenCookie(context.user, 200, res, context.sessionPayload);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateMe(req.user.id, req.body);
    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    // Support both camelCase and snake_case
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    await authService.updatePassword(req.user.id, currentPassword, newPassword);
    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers(req.user.id);
    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.blockUserByActor(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "BLOCK",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Blocked user "${targetUser.name}"` : "Blocked user",
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User blocked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.unblockUserByActor(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "UNBLOCK",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Unblocked user "${targetUser.name}"` : "Unblocked user",
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User unblocked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.deleteUser(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "DELETE",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Deleted user "${targetUser.name}"` : "Deleted user",
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const promoteStudentToAdmin = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.promoteStudentToAdmin(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);

    await logAdminActivity({
      adminUserId: req.user.id,
      action: "PROMOTE",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Promoted student "${targetUser.name}" to admin` : "Promoted student to admin",
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Student promoted to admin successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const convertAdminToStudent = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.convertAdminToStudent(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);

    await logAdminActivity({
      adminUserId: req.user.id,
      action: "DEMOTE_TO_STUDENT",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Converted admin "${targetUser.name}" to student` : "Converted admin to student",
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Admin converted to student successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const transferSuperAdmin = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await authService.transferSuperAdminRole(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.params.id);
    authService.invalidateSessionContextCache(req.user.id);

    await logAdminActivity({
      adminUserId: req.user.id,
      action: "TRANSFER_SUPER_ADMIN",
      entityType: "USER",
      entityId: req.params.id,
      description: targetUser?.name ? `Transferred super admin role to "${targetUser.name}"` : "Transferred super admin role",
      req,
    });

    const nextContext = await authService.resolveUserSessionContext(req.user.id);
    sendTokenCookie(nextContext.user, 200, res, nextContext.sessionPayload);
  } catch (error) {
    next(error);
  }
};

export const googleAuth = (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/auth/login?error=google_not_configured`);
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
};

export const googleCallback = (req, res, next) => {
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
};

export const googleCalendarAuth = (req, res) => {
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
};

export const googleCalendarCallback = async (req, res) => {
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

    let calendarEmail = user.email;
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

    await authService.connectGoogleCalendar(user.id, refreshToken, calendarEmail);

    return res.redirect(`${FRONTEND_URL}/dashboard/student/settings?calendar=connected`);
  } catch (error) {
    console.error("Google Calendar connect error:", error);
    return res.redirect(`${FRONTEND_URL}/dashboard/student/settings?error=google_calendar_callback_error`);
  }
};

export const getCalendarStatus = async (req, res, next) => {
  try {
    const data = await authService.getGoogleCalendarStatus(req.user.id);
    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectCalendar = async (req, res, next) => {
  try {
    await authService.disconnectGoogleCalendar(req.user.id);
    return res.status(200).json({
      status: "success",
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    next(error);
  }
};

