/**
 * System Configuration Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages global library settings (max loan days, daily fine, max books per user).
 *
 * There is always exactly ONE config row, seeded on first use.
 * Admins can update it; changes take effect immediately for new rentals.
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { notifyAdmins } from './notification.service.js';

const CONFIG_DEFAULTS = {
  max_loan_days: 14,
  daily_fine: 0,
  max_books_per_user: 3,
  reservation_window_hr: 24,
  low_stock_threshold: 2,
  never_returned_days: 60,
  reminder_days_before_due: 3,
  enable_notifications: true,
};

const CONFIG_SELECT_VARIANTS = [
  {
    id: true,
    max_loan_days: true,
    daily_fine: true,
    max_books_per_user: true,
    reservation_window_hr: true,
    low_stock_threshold: true,
    never_returned_days: true,
    reminder_days_before_due: true,
    enable_notifications: true,
    last_updated_by_id: true,
  },
  {
    id: true,
    max_loan_days: true,
    daily_fine: true,
    max_books_per_user: true,
    reservation_window_hr: true,
    low_stock_threshold: true,
    never_returned_days: true,
    enable_notifications: true,
    last_updated_by_id: true,
  },
  {
    id: true,
    max_loan_days: true,
    daily_fine: true,
    max_books_per_user: true,
    reservation_window_hr: true,
    low_stock_threshold: true,
    enable_notifications: true,
    last_updated_by_id: true,
  },
  {
    id: true,
    max_loan_days: true,
    daily_fine: true,
    max_books_per_user: true,
    enable_notifications: true,
    last_updated_by_id: true,
  },
];

const withDefaults = (config) => ({ ...CONFIG_DEFAULTS, ...config });

const findLatestConfigCompat = async () => {
  for (const select of CONFIG_SELECT_VARIANTS) {
    try {
      return await prisma.systemConfig.findFirst({
        orderBy: { id: 'desc' },
        select,
      });
    } catch (error) {
      if (error?.code !== 'P2022') throw error;
    }
  }
  return null;
};

const attachUpdatedByUser = async (config) => {
  if (!config) return null;
  if (!config.last_updated_by_id) return { ...config, updated_by_user: null };

  const updated_by_user = await prisma.user.findUnique({
    where: { id: config.last_updated_by_id },
    select: { id: true, name: true, email: true },
  });

  return { ...config, updated_by_user };
};

const getSystemConfigColumns = async () => {
  const rows = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SystemConfig'
  `;
  return new Set(rows.map((row) => row.column_name));
};

const setIfColumnExists = (target, columns, column, value) => {
  if (!columns.has(column) || value === undefined) return;
  target[column] = value;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const getConfig = async () => {
  const config = await findLatestConfigCompat();

  if (!config) {
    throw new AppError(
      'System configuration has not been initialized. Please contact the system administrator.',
      503
    );
  }

  const resolved = withDefaults(config);
  return attachUpdatedByUser(resolved);
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CONFIG (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update or seed system config.
 *
 * Body:
 *   max_loan_days       – integer 1-365
 *   daily_fine          – decimal 0.00-1000
 *   max_books_per_user  – integer 1-20
 *   enable_notifications – boolean
 */
export const updateConfig = async (adminId, data, io) => {
  const {
    max_loan_days,
    daily_fine,
    max_books_per_user,
    reservation_window_hr,
    low_stock_threshold,
    never_returned_days,
    reminder_days_before_due,
    enable_notifications,
  } = data;

  const maxDays = parseInt(max_loan_days, 10);
  const dailyFineNum = parseFloat(daily_fine);
  const maxBooks = parseInt(max_books_per_user, 10);
  const reservationWindow = parseInt(reservation_window_hr, 10);
  const lowStockThreshold = parseInt(low_stock_threshold, 10);
  const neverReturnedDays = parseInt(never_returned_days, 10);
  const reminderDaysBeforeDue = parseInt(reminder_days_before_due, 10);

  if (max_loan_days !== undefined && (isNaN(maxDays) || maxDays < 1 || maxDays > 365)) {
    throw new AppError('max_loan_days must be between 1 and 365', 400);
  }
  if (daily_fine !== undefined && (isNaN(dailyFineNum) || dailyFineNum < 0 || dailyFineNum > 10000)) {
    throw new AppError('daily_fine must be between 0 and 10000', 400);
  }
  if (max_books_per_user !== undefined && (isNaN(maxBooks) || maxBooks < 1 || maxBooks > 20)) {
    throw new AppError('max_books_per_user must be between 1 and 20', 400);
  }
  if (reservation_window_hr !== undefined && (isNaN(reservationWindow) || reservationWindow < 1 || reservationWindow > 168)) {
    throw new AppError('reservation_window_hr must be between 1 and 168', 400);
  }
  if (low_stock_threshold !== undefined && (isNaN(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 50)) {
    throw new AppError('low_stock_threshold must be between 0 and 50', 400);
  }
  if (never_returned_days !== undefined && (isNaN(neverReturnedDays) || neverReturnedDays < 7 || neverReturnedDays > 365)) {
    throw new AppError('never_returned_days must be between 7 and 365', 400);
  }
  if (reminder_days_before_due !== undefined && (isNaN(reminderDaysBeforeDue) || reminderDaysBeforeDue < 1 || reminderDaysBeforeDue > 30)) {
    throw new AppError('reminder_days_before_due must be between 1 and 30', 400);
  }

  const columns = await getSystemConfigColumns();
  const existing = await prisma.systemConfig.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });

  if (!existing) {
    if (max_loan_days === undefined || daily_fine === undefined || max_books_per_user === undefined) {
      throw new AppError(
        'Initial configuration requires max_loan_days, daily_fine, and max_books_per_user',
        400
      );
    }

    const createData = {
      max_loan_days: maxDays,
      daily_fine: dailyFineNum,
      max_books_per_user: maxBooks,
      last_updated_by_id: adminId,
    };
    setIfColumnExists(createData, columns, 'reservation_window_hr', reservationWindow || 24);
    setIfColumnExists(createData, columns, 'low_stock_threshold', lowStockThreshold || 2);
    setIfColumnExists(createData, columns, 'never_returned_days', neverReturnedDays || 60);
    setIfColumnExists(createData, columns, 'reminder_days_before_due', reminderDaysBeforeDue || 3);
    setIfColumnExists(
      createData,
      columns,
      'enable_notifications',
      enable_notifications !== undefined ? Boolean(enable_notifications) : true
    );

    await prisma.systemConfig.create({ data: createData, select: { id: true } });
  } else {
    const updateData = /** @type {Record<string, any>} */ ({
      last_updated_by_id: adminId,
    });

    if (max_loan_days !== undefined) updateData.max_loan_days = maxDays;
    if (daily_fine !== undefined) updateData.daily_fine = dailyFineNum;
    if (max_books_per_user !== undefined) updateData.max_books_per_user = maxBooks;
    setIfColumnExists(
      updateData,
      columns,
      'reservation_window_hr',
      reservation_window_hr !== undefined ? reservationWindow : undefined
    );
    setIfColumnExists(
      updateData,
      columns,
      'low_stock_threshold',
      low_stock_threshold !== undefined ? lowStockThreshold : undefined
    );
    setIfColumnExists(
      updateData,
      columns,
      'never_returned_days',
      never_returned_days !== undefined ? neverReturnedDays : undefined
    );
    setIfColumnExists(
      updateData,
      columns,
      'reminder_days_before_due',
      reminder_days_before_due !== undefined ? reminderDaysBeforeDue : undefined
    );
    setIfColumnExists(
      updateData,
      columns,
      'enable_notifications',
      enable_notifications !== undefined ? Boolean(enable_notifications) : undefined
    );

    await prisma.systemConfig.update({
      where: { id: existing.id },
      data: updateData,
      select: { id: true },
    });
  }

  const config = await getConfig();
  const updaterName = config.updated_by_user?.name || `Admin ${adminId}`;

  await notifyAdmins({
    message: `⚙️ System configuration updated by ${updaterName}. Max loan: ${config.max_loan_days}d | Fine: ${Number(config.daily_fine).toFixed(2)} ETB/day | Max books: ${config.max_books_per_user}.`,
    type: 'SYSTEM',
    io,
  });

  return config;
};
