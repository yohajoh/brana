import { prisma } from '../prisma.js';
import { createNotification } from './notification.service.js';
import { sendEmail } from './mail.service.js';
import { getCalendarClient } from '../utils/googleCalendar.js';

const getConfig = async () => {
  const defaults = {
    daily_fine: 0,
    reminder_days_before_due: 3,
  };

  try {
    const config = await prisma.systemConfig.findFirst({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        daily_fine: true,
        reminder_days_before_due: true,
      },
    });
    return config ? { ...defaults, ...config } : null;
  } catch (error) {
    // Backward compatibility: older DBs may not have reminder_days_before_due.
    if (error?.code === 'P2022') {
      const legacy = await prisma.systemConfig.findFirst({
        orderBy: { id: 'desc' },
        select: {
          id: true,
          daily_fine: true,
        },
      });
      return legacy ? { ...defaults, ...legacy } : null;
    }
    throw error;
  }
};

const toDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * Build a 15-minute event window starting at 09:00 UTC on the given date.
 * Returns RFC3339 UTC strings compatible with the Google Calendar API.
 */
const buildCalendarWindow = (date) => {
  const pad = (v) => String(v).padStart(2, '0');
  const datePart = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  return {
    startDateTime: `${datePart}T09:00:00Z`,
    endDateTime:   `${datePart}T09:15:00Z`,
  };
};

export const sendUpcomingReturnReminders = async (io) => {
  const config = await getConfig();
  if (!config) {
    console.warn('[AutoReminder] No system config found, skipping upcoming return reminders');
    return { remindersSent: 0 };
  }

  const reminderDays = config.reminder_days_before_due || 3;
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + reminderDays);

  const upcomingRentals = await prisma.rental.findMany({
    where: {
      status: 'BORROWED',
      due_date: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, google_refresh_token: true } },
      physical_book: { select: { id: true, title: true } },
    },
  });

  let sent = 0;

  for (const rental of upcomingRentals) {
    const daysUntilDue = Math.ceil(
      (new Date(rental.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dueDateStr = new Date(rental.due_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const notification = await createNotification({
      userId: rental.user_id,
      message: `⏰ Reminder: "${rental.physical_book.title}" is due in ${daysUntilDue} day(s). Due date: ${dueDateStr}. Please return on time to avoid fines.`,
      type: 'REMINDER',
      io,
      dedupeKey: `reminder:upcoming:${rental.id}:${toDayKey(now)}`,
    });
    if (!notification) continue;

    // Send email reminder
    try {
      await sendEmail({
        email: rental.user.email,
        subject: `Book Return Reminder: "${rental.physical_book.title}" is due in ${daysUntilDue} day(s)`,
        message: `Dear ${rental.user.name},\n\nThis is a friendly reminder that your borrowed book "${rental.physical_book.title}" is due in ${daysUntilDue} day(s).\n\nDue Date: ${dueDateStr}\n\nPlease return the book on time to avoid late fees.\n\nBest regards,\nBirana Library`,
      });
    } catch (error) {
      console.error(`[AutoReminder] Failed to send email to ${rental.user.email}:`, error?.message || error);
    }

    // Add Google Calendar event on the due date if user has calendar connected
    if (rental.user?.google_refresh_token && rental.user?.email) {
      try {
        const calendar = getCalendarClient(rental.user.google_refresh_token);
        const dueDate = new Date(rental.due_date);
        const { startDateTime, endDateTime } = buildCalendarWindow(dueDate);

        // Main due-date event
        await calendar.events.insert({
          calendarId: 'primary',
          resource: {
            summary: `📚 Return Due: "${rental.physical_book.title}"`,
            description: `Your borrowed book "${rental.physical_book.title}" is due TODAY.\n\nPlease return it to the library to avoid late fees.\n\nDue Date: ${dueDateStr}`,
            start: { dateTime: startDateTime, timeZone: 'UTC' },
            end:   { dateTime: endDateTime,   timeZone: 'UTC' },
            attendees: [{ email: rental.user.email }],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 60 },   // 1 hour before
                { method: 'popup', minutes: 30 },   // 30 min before
              ],
            },
            colorId: '5', // Banana yellow
          },
          sendUpdates: 'all',
        });

        // Early-warning event (reminderDays before due)
        if (daysUntilDue > 1) {
          const earlyDate = new Date(dueDate);
          earlyDate.setUTCDate(earlyDate.getUTCDate() - (daysUntilDue - 1));
          const { startDateTime: earlyStart, endDateTime: earlyEnd } = buildCalendarWindow(earlyDate);
          await calendar.events.insert({
            calendarId: 'primary',
            resource: {
              summary: `⏰ Due Soon: "${rental.physical_book.title}" (${daysUntilDue} days left)`,
              description: `Reminder: Your borrowed book "${rental.physical_book.title}" is due in ${daysUntilDue} day(s) on ${dueDateStr}.\n\nPlease plan to return it on time.`,
              start: { dateTime: earlyStart, timeZone: 'UTC' },
              end:   { dateTime: earlyEnd,   timeZone: 'UTC' },
              attendees: [{ email: rental.user.email }],
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 60 },
                  { method: 'popup', minutes: 0 },
                ],
              },
              colorId: '6', // Tangerine
            },
            sendUpdates: 'all',
          });
        }
      } catch (error) {
        console.error(`[AutoReminder] Failed to create upcoming calendar event for ${rental.user.email}:`, error?.message || error);
      }
    }

    sent++;
  }

  return { remindersSent: sent };
};

export const sendOverdueRemindersAutomated = async (io) => {
  const config = await getConfig();
  if (!config) {
    console.warn('[AutoReminder] No system config found, skipping overdue reminders');
    return { remindersSent: 0 };
  }

  const overdue = await prisma.rental.findMany({
    where: {
      status: 'BORROWED',
      due_date: { lt: new Date() },
    },
    include: {
      user: { select: { id: true, name: true, email: true, google_refresh_token: true } },
      physical_book: { select: { id: true, title: true } },
    },
  });

  const now = new Date();
  let sent = 0;

  for (const rental of overdue) {
    const daysOverdue = Math.ceil(
      (now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const estimatedFine = parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2));

    const notification = await createNotification({
      userId: rental.user_id,
      message: `🔴 OVERDUE ALERT: "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue. Estimated fine: ${estimatedFine} ETB. Please return it immediately to avoid additional fines.`,
      type: 'OVERDUE',
      io,
      dedupeKey: `reminder:overdue:${rental.id}:${toDayKey(now)}`,
    });
    if (!notification) continue;

    // Send email
    try {
      await sendEmail({
        email: rental.user.email,
        subject: `OVERDUE: "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue`,
        message: `Dear ${rental.user.name},\n\nYour borrowed book "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue.\n\nCurrent estimated fine: ${estimatedFine} ETB\n\nPlease return the book immediately to avoid additional fines.\n\nBest regards,\nBirana Library`,
      });
    } catch (error) {
      console.error(`[AutoReminder] Failed to send overdue email to ${rental.user.email}:`, error?.message || error);
    }

    // Add Google Calendar overdue alert event if user has calendar connected
    if (rental.user?.google_refresh_token && rental.user?.email) {
      try {
        const calendar = getCalendarClient(rental.user.google_refresh_token);
        const eventStart = now.toISOString();
        const eventEnd = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        const dueDateStr = new Date(rental.due_date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        await calendar.events.insert({
          calendarId: 'primary',
          resource: {
            summary: `🔴 OVERDUE: Return "${rental.physical_book.title}" Immediately`,
            description: `Your borrowed book "${rental.physical_book.title}" was due on ${dueDateStr} — ${daysOverdue} day(s) ago.\n\nEstimated fine: ${estimatedFine} ETB\n\nPlease return the book to the library immediately to stop accruing fines.`,
            start: { dateTime: eventStart, timeZone: 'UTC' },
            end:   { dateTime: eventEnd,   timeZone: 'UTC' },
            attendees: [{ email: rental.user.email }],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 0 },
                { method: 'popup', minutes: 0 },
              ],
            },
            colorId: '11', // Tomato red
          },
          sendUpdates: 'all',
        });
      } catch (error) {
        console.error(`[AutoReminder] Failed to create overdue calendar event for ${rental.user.email}:`, error?.message || error);
      }
    }

    sent++;
  }

  return { remindersSent: sent };
};
