/**
 * Rental Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete borrowing lifecycle for physical books:
 *
 * Statuses (from Prisma enum):
 *   BORROWED   – book checked out, not yet due
 *   PENDING    – book returned but fine not yet paid
 *   RETURNED   – book returned, no fine OR fine paid (via COMPLETED on Payment)
 *   COMPLETED  – fully closed (returned + fine settled)
 *
 * Business Rules:
 *   1. Max books per user (from SystemConfig)
 *   2. Available copies must be > 0
 *   3. User cannot borrow same book twice while borrowed
 *   4. On return: calculate fine if overdue, deduct from available
 *   5. Fine = overdue_days × daily_fine (from SystemConfig)
 *   6. Overdue = due_date has passed and status is still BORROWED
 *
 * Notifications:
 *   - Student: borrow confirmed, approaching due date (on-request), return confirmed,
 *              fine applied, fine paid
 *   - Admin:   new borrow, overdue alert, book returned
 */

import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";
import { createNotification, notifyAdmins } from "./notification.service.js";
import { applyTrustScoreDelta, recalculateUserTrustScore } from "./trustScore.service.js";
import { notifyNextInQueue, markReservationFulfilledForBorrow } from "./reservation.service.js";
import { syncLowStockAlertForBook } from "./inventoryAlert.service.js";
import { sendEmail } from "./mail.service.js";
import { getCalendarClient } from "../utils/googleCalendar.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the latest system config, throw if none exists. */
const getConfig = async () => {
  const defaults = {
    max_loan_days: 14,
    daily_fine: 0,
    max_books_per_user: 3,
  };

  try {
    const config = await prisma.systemConfig.findFirst({
      orderBy: { id: "desc" },
      select: {
        id: true,
        max_loan_days: true,
        daily_fine: true,
        max_books_per_user: true,
      },
    });
    return config ? { ...defaults, ...config } : defaults;
  } catch (error) {
    // Backward compatibility: DB might be behind the Prisma schema.
    if (error?.code === "P2022") {
      const legacy = await prisma.systemConfig.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      if (!legacy) {
        throw new AppError("System configuration is not set up. Please contact the admin.", 503);
      }
      return { ...defaults, ...legacy };
    }
    throw error;
  }
};

/**
 * Calculate fine for an overdue return.
 * @param {Date} dueDate
 * @param {Date} returnDate
 * @param {number|import('@prisma/client').Decimal} dailyFine
 * @returns {number} fine amount (0 if not overdue)
 */
const calculateFine = (dueDate, returnDate, dailyFine) => {
  const due = new Date(dueDate);
  const returned = new Date(returnDate);
  if (returned <= due) return 0;
  const overdueDays = Math.ceil((returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return parseFloat((overdueDays * Number(dailyFine)).toFixed(2));
};

/** Full include for a rental record */
const RENTAL_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      student_id: true,
      trust_score: true,
      standing: true,
      max_concurrent_loans_override: true,
    },
  },
  physical_book: {
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      pages: true,
      loan_duration_days: true,
      rental_price: true,
    },
  },
  copy: {
    select: { id: true, copy_code: true, condition: true, status: true, is_available: true },
  },
  payment: {
    select: {
      id: true,
      tx_ref: true,
      amount: true,
      method: true,
      status: true,
      paid_at: true,
    },
  },
  damage_incidents: {
    select: {
      id: true,
      damage_type: true,
      notes: true,
      evidence_url: true,
      penalty_amount: true,
      penalty_status: true,
      created_at: true,
    },
  },
};

const buildCopyCode = (bookId, sequence) => {
  const seq = String(sequence).padStart(4, "0");
  return `BC-${bookId.slice(0, 8).toUpperCase()}-${seq}`;
};

const normalizeTimeString = (value) => {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(String(value));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

const toUtcDateString = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const buildOverdueEventWindow = ({ dueDate, overdueTime }) => {
  const time = normalizeTimeString(overdueTime) || { hours: 9, minutes: 0 };
  const datePart = toUtcDateString(dueDate);
  // Append 'Z' so Google Calendar API receives valid RFC3339 UTC timestamps.
  const startDateTime = `${datePart}T${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(
    2,
    "0",
  )}:00Z`;
  const totalMinutes = time.hours * 60 + time.minutes + 15;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  let endDatePart = datePart;
  if (totalMinutes >= 24 * 60) {
    const base = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    base.setUTCDate(base.getUTCDate() + 1);
    endDatePart = toUtcDateString(base);
  }
  const endDateTime = `${endDatePart}T${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(
    2,
    "0",
  )}:00Z`;
  return { startDateTime, endDateTime };
};

const ensureAvailableCopy = async (bookId, copies, available) => {
  let copy = await prisma.bookCopy.findFirst({
    where: { book_id: bookId, deleted_at: null, is_available: true },
    orderBy: [{ acquired_at: "asc" }, { copy_code: "asc" }],
    select: { id: true },
  });
  if (copy) return copy;

  // Backward compatibility for older data where BookCopy rows were never created.
  const existingCount = await prisma.bookCopy.count({
    where: { book_id: bookId, deleted_at: null },
  });
  if (existingCount === 0 && copies > 0) {
    const allCopiesCount = await prisma.bookCopy.count({
      where: { book_id: bookId },
    });
    const unavailableCount = Math.max(0, copies - available);
    await prisma.bookCopy.createMany({
      data: Array.from({ length: copies }).map((_, idx) => ({
        book_id: bookId,
        copy_code: buildCopyCode(bookId, allCopiesCount + idx + 1),
        condition: "GOOD",
        is_available: idx >= unavailableCount,
      })),
    });

    copy = await prisma.bookCopy.findFirst({
      where: { book_id: bookId, deleted_at: null, is_available: true },
      orderBy: [{ acquired_at: "asc" }, { copy_code: "asc" }],
      select: { id: true },
    });
  }

  return copy;
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST ALL RENTALS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin: Paginated rental list with rich filters.
 *
 * Query params:
 *   ?status=BORROWED|PENDING|RETURNED|COMPLETED
 *   ?user_id=         – filter by student
 *   ?book_id=         – filter by book
 *   ?overdue=true     – only show overdue (BORROWED + past due date)
 *   ?sort=-loan_date|due_date|-due_date  (default: -loan_date)
 *   ?page=1&limit=20
 */
export const getAllRentals = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const VALID_STATUSES = ["BORROWED", "PENDING", "RETURNED", "COMPLETED"];
  const where = /** @type {any} */ ({});

  if (query.status) {
    const s = query.status.toUpperCase();
    if (!VALID_STATUSES.includes(s)) throw new AppError(`Invalid status: ${s}`, 400);
    where.status = s;
  }

  if (query.user_id) where.user_id = query.user_id;
  if (query.book_id) where.book_id = query.book_id;

  // Overdue filter: borrowed AND past due date
  if (query.overdue === "true") {
    where.status = "BORROWED";
    where.due_date = { lt: new Date() };
  }

  // Search by student name or book title
  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { physical_book: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  const ALLOWED = ["loan_date", "due_date", "return_date"];
  let orderBy = [{ loan_date: "desc" }];
  if (query.sort) {
    const desc = query.sort.startsWith("-");
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? "desc" : "asc" }];
  }

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({ where, include: RENTAL_INCLUDE, orderBy, skip, take: limit }),
    prisma.rental.count({ where }),
  ]);

  // Enrich with overdue flag
  const now = new Date();
  const enriched = rentals.map((r) => ({
    ...r,
    isOverdue: r.status === "BORROWED" && new Date(r.due_date) < now,
    daysOverdue:
      r.status === "BORROWED" && new Date(r.due_date) < now
        ? Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
  }));

  return { rentals: enriched, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// MY RENTALS (Student dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student: My rental history with overdue detection.
 *
 * Query params same as getAllRentals, but user_id is implicitly the logged-in user.
 *   ?status=BORROWED|PENDING|RETURNED|COMPLETED
 *   ?active=true  – only show BORROWED + PENDING
 */
export const getMyRentals = async (userId, query, options = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const VALID_STATUSES = ["BORROWED", "PENDING", "RETURNED", "COMPLETED"];
  const where = /** @type {any} */ ({ user_id: userId });
  if (options.studentProfileId) {
    where.student_profile_id = options.studentProfileId;
  }

  if (query.status) {
    const s = query.status.toUpperCase();
    if (!VALID_STATUSES.includes(s)) throw new AppError(`Invalid status: ${s}`, 400);
    where.status = s;
  }

  // Convenience: ?active=true → show only BORROWED and PENDING
  if (query.active === "true") {
    where.status = { in: ["BORROWED", "PENDING"] };
  }

  const [rentals, total, counts] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: RENTAL_INCLUDE,
      orderBy: { loan_date: "desc" },
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
    // Summary counts for student dashboard header
    prisma.rental.groupBy({
      by: ["status"],
      where: options.studentProfileId
        ? { user_id: userId, student_profile_id: options.studentProfileId }
        : { user_id: userId },
      _count: true,
    }),
  ]);

  const now = new Date();
  const enriched = rentals.map((r) => ({
    ...r,
    isOverdue: r.status === "BORROWED" && new Date(r.due_date) < now,
    daysOverdue:
      r.status === "BORROWED" && new Date(r.due_date) < now
        ? Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    daysUntilDue:
      r.status === "BORROWED" && new Date(r.due_date) >= now
        ? Math.ceil((new Date(r.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
  }));

  const statusSummary = counts.reduce((acc, c) => {
    acc[c.status] = c._count;
    return acc;
  }, {});

  return { rentals: enriched, statusSummary, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE RENTAL
// ─────────────────────────────────────────────────────────────────────────────

export const getRentalById = async (id, user) => {
  const rental = await prisma.rental.findUnique({
    where: { id },
    include: RENTAL_INCLUDE,
  });
  if (!rental) throw new AppError("Rental not found", 404);

  // Students can only see their own
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && rental.user_id !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  const now = new Date();
  return {
    ...rental,
    isOverdue: rental.status === "BORROWED" && new Date(rental.due_date) < now,
    daysOverdue:
      rental.status === "BORROWED" && new Date(rental.due_date) < now
        ? Math.ceil((now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BORROW A BOOK (Student)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Borrow a physical book.
 * Body: { book_id, loan_days? (optional override) }
 */
export const borrowBook = async (userId, { book_id, loan_days, time_zone, overdue_time }, io, options = {}) => {
  if (!book_id) throw new AppError("book_id is required", 400);

  const [config, book, user] = await Promise.all([
    getConfig(),
    prisma.book.findFirst({
      where: { id: book_id, deleted_at: null },
      select: {
        id: true,
        title: true,
        available: true,
        copies: true,
        loan_duration_days: true,
        rental_price: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        is_blocked: true,
        google_refresh_token: true,
        trust_score: true,
        standing: true,
        max_concurrent_loans_override: true,
      },
    }),
  ]);

  if (!book) throw new AppError("Book not found", 404);
  if (!user) throw new AppError("User not found", 404);
  if (user.is_blocked || user.standing === "SUSPENDED") {
    throw new AppError(
      `Borrowing is disabled for your account (${user.is_blocked ? "BLOCKED" : "SUSPENDED"}). Please contact library administration.`,
      403,
    );
  }

  if (book.available <= 0) {
    throw new AppError(
      `"${book.title}" has no available copies. Please check back later or add to your wishlist.`,
      400,
    );
  }

  // Check standing-dependent max active rental limit
  const [activeRentals, pendingFineCount] = await Promise.all([
    prisma.rental.count({
      where: {
        user_id: userId,
        ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
        status: { in: ["BORROWED", "PENDING"] },
      },
    }),
    prisma.rental.count({
      where: {
        user_id: userId,
        ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
        status: "PENDING",
        fine: { gt: 0 },
      },
    }),
  ]);

  const defaultCap = user.standing === "RED_FLAG" || user.standing === "YELLOW_FLAG" ? 1 : config.max_books_per_user;
  const effectiveMaxLoans = user.max_concurrent_loans_override ?? defaultCap;

  if (activeRentals >= effectiveMaxLoans) {
    // Give the student a meaningful message depending on what's blocking them
    const pendingFineTotal = pendingFineCount > 0
      ? await prisma.rental.aggregate({
          where: {
            user_id: userId,
            ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
            status: "PENDING",
            fine: { gt: 0 },
          },
          _sum: { fine: true },
        }).then((r) => Number(r._sum.fine ?? 0))
      : 0;

    if (pendingFineTotal > 0) {
      throw new AppError(
        `You have ${pendingFineCount} unpaid fine(s) totalling ${pendingFineTotal.toFixed(2)} ETB. Please settle your outstanding fines at the library desk before borrowing again.`,
        400,
      );
    }

    throw new AppError(
      `You have reached your maximum of ${effectiveMaxLoans} active rental(s) for your current account tier (${user.standing.replace(/_/g, " ")}). Return a book first.`,
      400,
    );
  }

  // Prevent duplicate borrow
  const alreadyBorrowed = await prisma.rental.findFirst({
    where: {
      user_id: userId,
      ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
      book_id,
      status: { in: ["BORROWED", "PENDING"] },
    },
  });
  if (alreadyBorrowed) {
    throw new AppError("You already have this book. Return it before borrowing again.", 409);
  }

  // Block on unpaid DAMAGE PENALTIES (DamageIncident records with penalty_status PENDING)
  // These are separate from overdue fines and must be cleared before any new borrow.
  const unpaidDamagePenalties = await prisma.damageIncident.findMany({
    where: { user_id: userId, penalty_status: "PENDING", penalty_amount: { gt: 0 } },
    select: { id: true, penalty_amount: true, copy: { select: { book: { select: { title: true } } } } },
  });
  if (unpaidDamagePenalties.length > 0) {
    const total = unpaidDamagePenalties.reduce((sum, i) => sum + Number(i.penalty_amount), 0);
    const titles = [...new Set(unpaidDamagePenalties.map(i => i.copy?.book?.title).filter(Boolean))].slice(0, 2).join(", ");
    throw new AppError(
      `You have ${unpaidDamagePenalties.length} unpaid damage penalty fee(s) totalling ${total.toFixed(2)} ETB (${titles || "book copy"}). Please settle damage fees at the library desk or in your payment page before borrowing again.`,
      403,
    );
  }

  // Users with debt must explicitly settle it through borrow checkout flow.
  const debt = await prisma.rental.aggregate({
    where: {
      user_id: userId,
      ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
      status: "PENDING",
      fine: { gt: 0 },
      return_date: { not: null },
    },
    _sum: { fine: true },
  });
  const outstandingDebt = Number(debt._sum.fine ?? 0);
  const allowDebtSettlement =
    options.allowDebtSettlement === true || options.allowDebtSettlement === "true" || options.allowDebtSettlement === 1;
  if (outstandingDebt > 0 && !allowDebtSettlement) {
    throw new AppError(
      `You have outstanding debt of ${outstandingDebt.toFixed(2)} ETB. Complete checkout with debt settlement before borrowing.`,
      409,
    );
  }

  // Calculate due date
  const maxAllowedLoanDays = book.loan_duration_days || config.max_loan_days;
  const loanDays = parseInt(loan_days, 10) || maxAllowedLoanDays;
  if (loanDays < 1 || loanDays > maxAllowedLoanDays) {
    throw new AppError(`Loan period must be between 1 and ${maxAllowedLoanDays} days`, 400);
  }
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  const copy = await ensureAvailableCopy(book.id, book.copies, book.available);
  if (!copy) {
    throw new AppError(`No available copy record found for "${book.title}". Please contact admin.`, 409);
  }

  const copyDetail = await prisma.bookCopy.findUnique({ where: { id: copy.id } });
  const outgoingCondition = copyDetail?.condition || "GOOD";

  // Atomic transaction: create rental + mark copy unavailable + decrement book.available
  const [rental] = await prisma.$transaction([
    prisma.rental.create({
      data: {
        user_id: userId,
        actor_user_id: options.actorUserId || userId,
        student_profile_id: options.studentProfileId || null,
        book_id,
        copy_id: copy.id,
        outgoing_condition: outgoingCondition,
        due_date: dueDate,
        status: "BORROWED",
      },
      include: RENTAL_INCLUDE,
    }),
    prisma.bookCopy.update({
      where: { id: copy.id },
      data: { is_available: false, status: "BORROWED" },
    }),
    prisma.book.update({
      where: { id: book_id },
      data: { available: { decrement: 1 } },
    }),
  ]);

  // Log Condition History Audit
  await prisma.bookConditionHistory.create({
    data: {
      copy_id: copy.id,
      rental_id: rental.id,
      custody_user_id: userId,
      old_condition: outgoingCondition,
      new_condition: outgoingCondition,
      old_status: "AVAILABLE",
      new_status: "BORROWED",
      notes: `Checked out to borrower ${user.name}`,
      updated_by_user_id: options.actorUserId || userId,
    },
  });

  await Promise.all([
    markReservationFulfilledForBorrow(userId, book_id, {
      studentProfileId: options.studentProfileId || null,
    }),
    syncLowStockAlertForBook(book_id),
  ]);

  // ── Notifications ──────────────────────────────────────────────────────────

  const dueDateStr = dueDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Student notification
  await createNotification({
    userId,
    message: `📚 You have successfully borrowed "${book.title}". Please return it by ${dueDateStr}. Loan period: ${loanDays} day(s).`,
    type: "INFO",
    io,
  });

  // Admin notifications
  await notifyAdmins({
    message: `📖 ${user.name} (${user.email}) has borrowed "${book.title}". Due: ${dueDateStr}. Remaining copies: ${book.available - 1}.`,
    type: "INFO",
    io,
  });

  const copyCode = rental.copy?.copy_code || "N/A";
  const emailSubject = `Borrow Confirmed: "${book.title}"`;
  const emailBodyText = `Dear ${user.name},

You have successfully borrowed "${book.title}".

Borrow Details:
- Borrow ID: ${rental.id}
- Copy Code: ${copyCode}
- Due Date: ${dueDateStr}
- Loan Period: ${loanDays} day(s)

Please return the book on or before the due date to avoid late fees.

Best regards,
Birana Library`;
  const emailBodyHtml = `<p>Dear ${user.name},</p><p>You have successfully borrowed "<strong>${book.title}</strong>".</p><p><strong>Borrow Details</strong><br/>Borrow ID: ${rental.id}<br/>Copy Code: ${copyCode}<br/>Due Date: ${dueDateStr}<br/>Loan Period: ${loanDays} day(s)</p><p>Please return the book on or before the due date to avoid late fees.</p><p>Best regards,<br/>Birana Library</p>`;

  try {
    await sendEmail({
      email: user.email,
      subject: emailSubject,
      message: emailBodyText,
      html: emailBodyHtml,
    });
  } catch (error) {
    console.error(`Failed to send borrow confirmation email to ${user.email}:`, error);
  }

  if (user.google_refresh_token) {
    try {
      const calendar = getCalendarClient(user.google_refresh_token);
      const { startDateTime, endDateTime } = buildOverdueEventWindow({
        dueDate,
        overdueTime: overdue_time,
      });
      const event = {
        summary: `Overdue Alert: ${book.title}`,
        description: `Your borrowed book "${book.title}" is due on ${dueDateStr}. Please return it on time to avoid fines.`,
        start: {
          dateTime: startDateTime,
          timeZone: time_zone || "UTC",
        },
        end: {
          dateTime: endDateTime,
          timeZone: time_zone || "UTC",
        },
        attendees: [{ email: user.email }],
        reminders: {
          useDefault: false,
          overrides: [{ method: "email", minutes: 0 }],
        },
      };

      await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        sendUpdates: "all",
      });

      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - 1);
      const { startDateTime: reminderStart, endDateTime: reminderEnd } = buildOverdueEventWindow({
        dueDate: reminderDate,
        overdueTime: overdue_time,
      });
      const reminderEvent = {
        summary: `Due Tomorrow: ${book.title}`,
        description: `Reminder: Your borrowed book "${book.title}" is due tomorrow (${dueDateStr}). Please return it on time to avoid fines.`,
        start: {
          dateTime: reminderStart,
          timeZone: time_zone || "UTC",
        },
        end: {
          dateTime: reminderEnd,
          timeZone: time_zone || "UTC",
        },
        attendees: [{ email: user.email }],
        reminders: {
          useDefault: false,
          overrides: [{ method: "email", minutes: 0 }],
        },
      };

      await calendar.events.insert({
        calendarId: "primary",
        resource: reminderEvent,
        sendUpdates: "all",
      });
    } catch (error) {
      console.error("Failed to schedule overdue calendar event:", error);
    }
  }

  return { ...rental, daysUntilDue: loanDays, dueDate };
};

// ─────────────────────────────────────────────────────────────────────────────
// RETURN A BOOK (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process book return. Admin only.
 */
export const returnBook = async (rentalId, io) => {
  return returnBookWithInspection(rentalId, {}, io);
};

const DAMAGE_PENALTY_RATES = {
  TORN_COVER: 50,
  HEAVY_ANNOTATION: 50,
  BROKEN_BINDING: 100,
  WATER_DAMAGE: 150,
  MISSING_PAGES: 150,
  LOST: 300,
  OTHER: 75,
};

const calculateDamagePenalty = (damageType, bookRentalPrice) => {
  const baseRate = DAMAGE_PENALTY_RATES[damageType] || 50;
  const price = Number(bookRentalPrice || 10);
  return parseFloat((baseRate + price * 2).toFixed(2));
};

/**
 * Advanced Two-Phase Return Handshake with Physical Copy Inspection & Damage Assessment
 */
export const returnBookWithInspection = async (
  rentalId,
  { inspectorId, returnedCondition, damageType, notes, evidenceUrl, waivePenalty } = {},
  io,
) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      physical_book: { select: { id: true, title: true, rental_price: true } },
      user: { select: { id: true, name: true, email: true, trust_score: true } },
      copy: true,
    },
  });

  if (!rental) throw new AppError("Rental not found", 404);
  if (rental.status === "RETURNED" || rental.status === "COMPLETED") {
    throw new AppError("This book rental has already been closed/returned.", 400);
  }

  const config = await getConfig();
  const returnDate = new Date();
  const outgoingCondition = rental.outgoing_condition || rental.copy?.condition || "GOOD";
  const finalReturnedCondition = returnedCondition || outgoingCondition;

  // Overdue fine calculation
  const overdueFine = calculateFine(rental.due_date, returnDate, config.daily_fine);
  const overdueDays = Math.ceil((returnDate.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24));

  // Condition degradation check
  const conditionOrder = { NEW: 4, GOOD: 3, WORN: 2, DAMAGED: 1, LOST: 0 };
  const isConditionDegraded = conditionOrder[finalReturnedCondition] < conditionOrder[outgoingCondition];
  const isLostOrDamaged = finalReturnedCondition === "DAMAGED" || finalReturnedCondition === "LOST" || isConditionDegraded;

  let damagePenalty = 0;

  if (isLostOrDamaged) {
    const selectedDamageType = damageType || (finalReturnedCondition === "LOST" ? "LOST" : "OTHER");
    if (!waivePenalty) {
      damagePenalty = calculateDamagePenalty(selectedDamageType, rental.physical_book?.rental_price);
    }
  }

  const totalFine = parseFloat((overdueFine + damagePenalty).toFixed(2));
  const newStatus = totalFine > 0 ? "PENDING" : "RETURNED";

  let newCopyStatus = "AVAILABLE";
  let copyIsAvailable = true;

  if (finalReturnedCondition === "DAMAGED") {
    newCopyStatus = "DAMAGED_REPAIR";
    copyIsAvailable = false;
  } else if (finalReturnedCondition === "LOST") {
    newCopyStatus = "LOST";
    copyIsAvailable = false;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update Rental
    const updatedRental = await tx.rental.update({
      where: { id: rentalId },
      data: {
        status: newStatus,
        return_date: returnDate,
        returned_condition: finalReturnedCondition,
        fine: totalFine > 0 ? totalFine : null,
      },
      include: RENTAL_INCLUDE,
    });

    // 2. Update Copy
    if (rental.copy_id) {
      await tx.bookCopy.update({
        where: { id: rental.copy_id },
        data: {
          condition: finalReturnedCondition,
          status: newCopyStatus,
          is_available: copyIsAvailable,
          last_condition_update: returnDate,
          ...(notes ? { notes } : {}),
        },
      });

      // Log Condition Audit
      await tx.bookConditionHistory.create({
        data: {
          copy_id: rental.copy_id,
          rental_id: rentalId,
          custody_user_id: rental.user_id,
          old_condition: outgoingCondition,
          new_condition: finalReturnedCondition,
          old_status: "BORROWED",
          new_status: newCopyStatus,
          notes: notes || `Return inspection completed by inspector ${inspectorId || "admin"}`,
          updated_by_user_id: inspectorId || rental.user_id,
        },
      });
    }

    // 3. Update Book stock
    if (copyIsAvailable && rental.book_id) {
      await tx.book.update({
        where: { id: rental.book_id },
        data: { available: { increment: 1 } },
      });
    }

    // 4. Create Damage Incident if damaged or lost
    let createdIncident = null;
    if (isLostOrDamaged && rental.copy_id) {
      const selectedDamageType = damageType || (finalReturnedCondition === "LOST" ? "LOST" : "OTHER");
      createdIncident = await tx.damageIncident.create({
        data: {
          copy_id: rental.copy_id,
          rental_id: rentalId,
          user_id: rental.user_id,
          inspector_id: inspectorId || rental.user_id,
          outgoing_condition: outgoingCondition,
          returned_condition: finalReturnedCondition,
          damage_type: selectedDamageType,
          notes: notes || "Degraded condition detected during return inspection",
          evidence_url: evidenceUrl || null,
          penalty_amount: damagePenalty,
          penalty_status: damagePenalty > 0 ? "PENDING" : "WAIVED",
        },
      });
    }

    // 5. Calculate Trust Score Adjustments
    let trustDelta = 0;
    if (overdueDays > 0) {
      trustDelta -= overdueDays * 2;
    }
    if (isLostOrDamaged) {
      if (finalReturnedCondition === "LOST") trustDelta -= 50;
      else if (damageType === "BROKEN_BINDING" || damageType === "WATER_DAMAGE" || damageType === "MISSING_PAGES") trustDelta -= 40;
      else trustDelta -= 25;
    }
    if (overdueDays <= 0 && !isLostOrDamaged) {
      trustDelta += 2;
    }

    if (trustDelta !== 0) {
      await applyTrustScoreDelta(rental.user_id, trustDelta, "Return inspection completed", tx);
    } else {
      await recalculateUserTrustScore(rental.user_id, tx);
    }

    return { updatedRental, createdIncident, totalFine, overdueFine, damagePenalty };
  });

  if (copyIsAvailable && rental.book_id) {
    await Promise.all([notifyNextInQueue(rental.book_id, io), syncLowStockAlertForBook(rental.book_id)]);
  }

  const returnDateStr = returnDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (result.totalFine > 0) {
    await createNotification({
      userId: rental.user_id,
      message: `⚠️ Return Inspection Completed: "${rental.physical_book.title}". Total fine: ${result.totalFine.toFixed(2)} ETB (Overdue: ${result.overdueFine.toFixed(2)} ETB, Damage penalty: ${result.damagePenalty.toFixed(2)} ETB).`,
      type: "ALERT",
      io,
    });
    await notifyAdmins({
      message: `📋 ${rental.user.name} returned "${rental.physical_book.title}". Total fine: ${result.totalFine.toFixed(2)} ETB (Damage: ${result.damagePenalty.toFixed(2)} ETB). Awaiting payment.`,
      type: "INFO",
      io,
    });
  } else {
    await createNotification({
      userId: rental.user_id,
      message: `✅ Return Inspection Passed: "${rental.physical_book.title}" returned on ${returnDateStr} in ${finalReturnedCondition} condition. Thank you!`,
      type: "INFO",
      io,
    });
    await notifyAdmins({
      message: `✅ ${rental.user.name} returned "${rental.physical_book.title}" in ${finalReturnedCondition} condition.`,
      type: "INFO",
      io,
    });
  }

  return {
    ...result.updatedRental,
    fine: result.totalFine,
    overdueFine: result.overdueFine,
    damagePenalty: result.damagePenalty,
    incident: result.createdIncident,
    newStatus,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET OVERDUE RENTALS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All rentals where status = BORROWED and due_date < now.
 * Includes how many days overdue and estimated fine.
 */
export const getOverdueRentals = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({
    status: "BORROWED",
    due_date: { lt: new Date() },
  });

  if (query.user_id) where.user_id = query.user_id;

  const [rentals, total, config] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: RENTAL_INCLUDE,
      orderBy: { due_date: "asc" }, // most overdue first
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
    getConfig(),
  ]);

  const now = new Date();
  const enriched = rentals.map((r) => {
    const daysOverdue = Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...r,
      daysOverdue,
      estimatedFine: parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2)),
    };
  });

  return { rentals: enriched, meta: paginationMeta(total, page, limit) };
};

export const getOverdueRanking = async (query) => {
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const config = await getConfig();
  const now = new Date();

  const rows = await prisma.rental.findMany({
    where: /** @type {any} */ ({ status: "BORROWED", due_date: { lt: now } }),
    select: {
      id: true,
      due_date: true,
      fine: true,
      user: { select: { id: true, name: true, email: true, student_id: true } },
      physical_book: { select: { title: true } },
    },
  });

  const grouped = rows.reduce((acc, row) => {
    const days = Math.ceil((now.getTime() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const estimated =
      Number(row.fine ?? 0) > 0 ? Number(row.fine ?? 0) : parseFloat((days * Number(config.daily_fine)).toFixed(2));
    if (!acc[row.user.id]) {
      acc[row.user.id] = {
        user: row.user,
        overdueCount: 0,
        totalDaysOverdue: 0,
        totalEstimatedFine: 0,
        items: [],
      };
    }
    acc[row.user.id].overdueCount += 1;
    acc[row.user.id].totalDaysOverdue += days;
    acc[row.user.id].totalEstimatedFine += estimated;
    acc[row.user.id].items.push({
      rentalId: row.id,
      bookTitle: row.physical_book.title,
      daysOverdue: days,
      estimatedFine: estimated,
    });
    return acc;
  }, {});

  const ranking = Object.values(grouped)
    .map((entry) => ({
      ...entry,
      totalEstimatedFine: parseFloat(entry.totalEstimatedFine.toFixed(2)),
    }))
    .sort((a, b) => b.totalDaysOverdue - a.totalDaysOverdue || b.totalEstimatedFine - a.totalEstimatedFine)
    .slice(0, limit);

  return { ranking };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND OVERDUE REMINDERS (Admin cron action)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin triggers overdue reminders for all overdue borrowers.
 * Returns count of notifications sent.
 */
export const sendOverdueReminders = async (io, rentalIds = []) => {
  const whereClause = { status: "BORROWED", due_date: { lt: new Date() } };
  if (rentalIds && Array.isArray(rentalIds) && rentalIds.length > 0) {
    whereClause.id = { in: rentalIds };
  }

  const overdue = await prisma.rental.findMany({
    where: /** @type {any} */ (whereClause),
    select: {
      id: true,
      user_id: true,
      due_date: true,
      physical_book: { select: { title: true } },
      user: { select: { id: true, name: true, email: true, google_refresh_token: true } },
    },
  });

  const config = await getConfig();
  const now = new Date();
  let sent = 0;

  for (const rental of overdue) {
    const daysOverdue = Math.ceil((now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const estimatedFine = parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2));

    await createNotification({
      userId: rental.user_id,
      message: `🔴 OVERDUE ALERT: "${rental.physical_book.title}" was due ${daysOverdue} day(s) ago. Estimated fine: ${estimatedFine} ETB. Please return it immediately.`,
      type: "ALERT",
      io,
    });

    // Add Google Calendar event for overdue alert if user has calendar connected
    if (rental.user?.google_refresh_token && rental.user?.email) {
      try {
        const calendar = getCalendarClient(rental.user.google_refresh_token);
        const eventStart = now.toISOString();
        const eventEnd = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        const dueDateStr = new Date(rental.due_date).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
        const event = {
          summary: `🔴 OVERDUE: Return "${rental.physical_book.title}" Now`,
          description: `Your borrowed book "${rental.physical_book.title}" was due on ${dueDateStr} — ${daysOverdue} day(s) ago.\n\nEstimated fine: ${estimatedFine} ETB\n\nPlease return the book immediately to avoid additional fines.`,
          start: { dateTime: eventStart, timeZone: "UTC" },
          end: { dateTime: eventEnd, timeZone: "UTC" },
          attendees: [{ email: rental.user.email }],
          reminders: {
            useDefault: false,
            overrides: [{ method: "email", minutes: 0 }, { method: "popup", minutes: 0 }],
          },
          colorId: "11", // Tomato red
        };
        await calendar.events.insert({
          calendarId: "primary",
          resource: event,
          sendUpdates: "all",
        });
      } catch (error) {
        console.error(`[sendOverdueReminders] Failed to create calendar event for ${rental.user.email}:`, error?.message || error);
      }
    }

    sent++;
  }

  return { remindersSent: sent };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN EXTEND DUE DATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin can extend a rental's due date.
 * Body: { extra_days }
 */
export const extendRental = async (rentalId, { extra_days }, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { id: true, name: true } },
      physical_book: { select: { title: true } },
    },
  });
  if (!rental) throw new AppError("Rental not found", 404);
  if (rental.status !== "BORROWED") {
    throw new AppError("Can only extend active (BORROWED) rentals", 400);
  }

  const days = parseInt(extra_days, 10);
  if (!days || days < 1 || days > 30) {
    throw new AppError("extra_days must be between 1 and 30", 400);
  }

  const newDueDate = new Date(rental.due_date);
  newDueDate.setDate(newDueDate.getDate() + days);

  const updated = await prisma.rental.update({
    where: { id: rentalId },
    data: { due_date: newDueDate },
    include: RENTAL_INCLUDE,
  });

  // Notify student
  await createNotification({
    userId: rental.user_id,
    message: `📅 Great news! Your rental of "${rental.physical_book.title}" has been extended by ${days} day(s). New due date: ${newDueDate.toDateString()}.`,
    type: "INFO",
    io,
  });

  return updated;
};

/**
 * Admin: Settle a pending rental fine (CASH or WAIVE) directly at the library desk.
 */
export const settleRentalFine = async (rentalId, { method = "CASH", notes } = {}, adminUserId, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: RENTAL_INCLUDE,
  });

  if (!rental) throw new AppError("Rental not found", 404);
  if (rental.status !== "PENDING") {
    throw new AppError("Only rentals with PENDING status (awaiting fine payment) can be settled.", 400);
  }

  const fineAmount = Number(rental.fine || 0);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update rental status to COMPLETED
    const updatedRental = await tx.rental.update({
      where: { id: rentalId },
      data: { status: "COMPLETED" },
      include: RENTAL_INCLUDE,
    });

    // 2. Record payment (upsert to handle if a Payment record already exists for this rental_id)
    const timestamp = Date.now();
    const tx_ref = `BRANA-CASH-${timestamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await tx.payment.upsert({
      where: { rental_id: rentalId },
      update: {
        amount: fineAmount,
        context: "FINE",
        method: method === "WAIVE" ? "CASH" : (method || "CASH"),
        status: "SUCCESS",
        paid_at: new Date(),
      },
      create: {
        rental_id: rentalId,
        tx_ref,
        amount: fineAmount,
        context: "FINE",
        method: method === "WAIVE" ? "CASH" : (method || "CASH"),
        status: "SUCCESS",
        paid_at: new Date(),
      },
    });


    // 3. Mark damage incidents as PAID or WAIVED
    await tx.damageIncident.updateMany({
      where: { rental_id: rentalId, penalty_status: "PENDING" },
      data: { penalty_status: method === "WAIVE" ? "WAIVED" : "PAID" },
    });

    // 4. Recalculate user trust score & standing
    await recalculateUserTrustScore(rental.user_id, tx);

    return updatedRental;
  });

  const actionText = method === "WAIVE" ? "waived by librarian" : "settled in cash";
  await createNotification({
    userId: rental.user_id,
    message: `✅ Fine of ${fineAmount.toFixed(2)} ETB for "${rental.physical_book?.title || "Book"}" has been ${actionText}. Your loan is fully closed!`,
    type: "INFO",
    io,
  });

  return result;
};

