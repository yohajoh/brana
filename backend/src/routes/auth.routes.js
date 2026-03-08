import express from "express";
import * as authController from "../controllers/auth.controller.js";
import * as authService from "../services/auth.service.js";
import { body } from "express-validator";
import passport from "passport";
import { generateToken } from "../utils/token.utils.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
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
  authController.signup
);

router.get("/confirm-email/:token", authController.confirmEmail);

router.post("/login", authLimiter, authController.login);

router.get("/logout", authController.logout);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const GOOGLE_EXCHANGE_TIMEOUT_MS = 10000;

// Google OAuth
router.get("/google", (req, res, next) => {
  console.log("Initiating Google Auth flow...");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", async (req, res) => {
  const code = String(req.query.code || "");
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/login?error=missing_google_code`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_EXCHANGE_TIMEOUT_MS);

  try {
    const callbackUrl = process.env.CALLBACK_URL;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!callbackUrl || !clientId || !clientSecret) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_config_missing`);
    }

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    });

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });

    if (!tokenRes.ok) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_exchange_failed`);
    }

    const tokenJson = await tokenRes.json();
    const idToken = tokenJson?.id_token;
    if (!idToken) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_id_token_missing`);
    }

    const [, payloadB64] = idToken.split(".");
    if (!payloadB64) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_token_invalid`);
    }
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (payload.aud !== clientId) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_token_audience`);
    }

    const email = payload.email;
    const name = payload.name || payload.given_name || (email ? String(email).split("@")[0] : null);
    if (!email) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_email_missing`);
    }

    const user = await authService.loginOrCreateGoogleUser({ email, name });

    const token = generateToken(user.id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };
    res.cookie("token", token, cookieOptions);

    const needsProfileCompletion =
      user.role !== "ADMIN" &&
      (!user.student_id || !user.phone || !user.year || !user.department);
    const redirectPath = needsProfileCompletion
      ? "/auth/complete-profile"
      : user.role === "ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/student";
    return res.redirect(`${FRONTEND_URL}${redirectPath}`);
  } catch (err) {
    if (err?.name === "AbortError") {
      console.error("Google Auth callback timed out");
      return res.redirect(`${FRONTEND_URL}/auth/login?error=auth_timeout`);
    }
    console.error("Google Auth callback error:", err?.message || err);
    return res.redirect(`${FRONTEND_URL}/auth/login?error=auth_failed`);
  } finally {
    clearTimeout(timer);
  }
});

// Public password reset routes
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.forgotPassword
);

router.post(
  "/reset-password/:token",
  [body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")],
  authController.resetPassword
);

// Protected routes
router.use(protect);

router.get("/me", authController.getMe);
router.patch("/update-me", authController.updateMe);
router.patch("/update-password", authController.updatePassword);

// Admin only routes
router.get("/users", restrictTo("ADMIN"), authController.getAllUsers);
router.patch("/users/:id/block", restrictTo("ADMIN"), authController.blockUser);
router.patch("/users/:id/unblock", restrictTo("ADMIN"), authController.unblockUser);
router.delete("/users/:id", restrictTo("ADMIN"), authController.deleteUser);

export default router;
