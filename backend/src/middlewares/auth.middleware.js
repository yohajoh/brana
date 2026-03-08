import { verifyToken } from "../utils/token.utils.js";
import { prisma } from "../prisma.js";
import { AppError } from "./error.middleware.js";

const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  year: true,
  department: true,
  student_id: true,
  role: true,
  is_confirmed: true,
  is_blocked: true,
  created_at: true,
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AUTH_USER_CACHE_TTL_MS = Math.max(0, toNumber(process.env.AUTH_USER_CACHE_TTL_MS, 5000));
const AUTH_USER_CACHE_MAX_SIZE = Math.max(100, toNumber(process.env.AUTH_USER_CACHE_MAX_SIZE, 10000));
const authUserCache = new Map();

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const getCachedAuthUser = async (userId) => {
  const now = Date.now();
  if (AUTH_USER_CACHE_TTL_MS > 0) {
    const cached = authUserCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: AUTH_USER_SELECT,
  });

  if (AUTH_USER_CACHE_TTL_MS > 0 && user) {
    if (authUserCache.size >= AUTH_USER_CACHE_MAX_SIZE) {
      authUserCache.clear();
    }
    authUserCache.set(userId, {
      user,
      expiresAt: now + AUTH_USER_CACHE_TTL_MS,
    });
  }

  return user;
};

export const invalidateAuthUserCache = (userId) => {
  if (!userId) {
    authUserCache.clear();
    return;
  }
  authUserCache.delete(userId);
};

/**
 * Middleware to protect routes and populate req.user
 * @param {import('express').Request & { user: import('@prisma/client').User }} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === "string" || !decoded.id) {
      return next(new AppError("Invalid token or session expired", 401));
    }

    const currentUser = await getCachedAuthUser(decoded.id);

    if (!currentUser) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (currentUser.is_blocked) {
      return next(new AppError("Your account is blocked.", 403));
    }

    req.user = currentUser;
    next();
  } catch {
    return next(new AppError("Invalid token or session expired", 401));
  }
};

/**
 * Optional auth middleware.
 * If token is missing/invalid, request continues as anonymous.
 * If token is valid, req.user is attached.
 */
export const optionalProtect = async (req, _res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || typeof decoded === "string" || !decoded.id) {
      return next();
    }

    const currentUser = await getCachedAuthUser(decoded.id);

    if (!currentUser || currentUser.is_blocked) {
      return next();
    }

    req.user = currentUser;
    return next();
  } catch {
    return next();
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};
