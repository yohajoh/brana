// routes/invoice.js
// const express = require("express");
import express from "express";
// const { getCalendarClient } = require("../utils/googleCalendar");
import { getCalendarClient } from "../utils/googleCalendar.js";
import { prisma } from "../prisma.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/api/invoice/overdue", protect, async (req, res) => {
  const { dueDate, timeZone, overdueTime } = req.body;

  if (!dueDate || !overdueTime) {
    return res
      .status(400)
      .json({ error: "dueDate and overdueTime are required" });
  }

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(overdueTime);
  if (!timeMatch) {
    return res.status(400).json({ error: "Invalid overdueTime format" });
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) {
    return res.status(400).json({ error: "Invalid overdueTime value" });
  }

  const warningDate = new Date(dueDate);
  if (Number.isNaN(warningDate.getTime())) {
    return res.status(400).json({ error: "Invalid dueDate" });
  }

  const pad = (value) => String(value).padStart(2, "0");
  const toDateString = (date) =>
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
      date.getUTCDate(),
    )}`;

  let datePart = null;
  if (typeof dueDate === "string") {
    const candidate = dueDate.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      datePart = candidate;
    }
  }
  if (!datePart) {
    datePart = toDateString(warningDate);
  }

  const startDateTime = `${datePart}T${pad(hours)}:${pad(minutes)}:00`;
  const totalMinutes = hours * 60 + minutes + 15;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  let endDatePart = datePart;
  if (totalMinutes >= 24 * 60) {
    const base = new Date(
      Date.UTC(
        warningDate.getUTCFullYear(),
        warningDate.getUTCMonth(),
        warningDate.getUTCDate(),
      ),
    );
    base.setUTCDate(base.getUTCDate() + 1);
    endDatePart = toDateString(base);
  }
  const endDateTime = `${endDatePart}T${pad(endHours)}:${pad(endMinutes)}:00`;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, google_refresh_token: true },
    });

    if (!user?.email) {
      return res.status(400).json({ error: "User email missing" });
    }

    if (!user.google_refresh_token) {
      return res
        .status(403)
        .json({ error: "Google Calendar not connected" });
    }

    const calendar = getCalendarClient(user.google_refresh_token);

    const event = {
      summary: "ACTION REQUIRED: Payment Overdue",
      description:
        "Your invoice is overdue. Please make a payment immediately to avoid service interruption.",
      start: {
        dateTime: startDateTime,
        timeZone: timeZone || "UTC",
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone || "UTC",
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

    res.json({ message: "Overdue warning scheduled." });
  } catch (error) {
    console.error("Calendar API error:", error);
    res.status(500).json({ error: "Failed to schedule warning." });
  }
});

// module.exports = router;
export default router;
