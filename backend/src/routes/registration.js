// routes/registration.js
// const express = require("express");
import express from "express";
import { config } from "dotenv";
import { getCalendarClient } from "../utils/googleCalendar.js";
import { prisma } from "../prisma.js";
import { protect } from "../middlewares/auth.middleware.js";
// const { getCalendarClient } = require("../utils/googleCalendar");

config();
const router = express.Router();

router.post("/api/register", protect, async (req, res) => {
  const { timeZone } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { email: true, name: true, google_refresh_token: true },
  });

  if (!user?.email || !user?.name) {
    return res.status(400).json({ error: "User email or name missing" });
  }
  if (!user.google_refresh_token) {
    return res
      .status(403)
      .json({ error: "Google Calendar not connected" });
  }

  // 1. Save user to your PostgreSQL database (your existing logic)
  // await db.saveUser({ email, name });

  try {
    // 2. Get the Google Calendar client using the refresh token you stored for this user/app
    const calendar = getCalendarClient(user.google_refresh_token);

    // 3. Define an immediate "event" to trigger the email
    const now = new Date();
    const event = {
      summary: `Welcome to MyApp, ${user.name}!`,
      description: "We are so glad you joined. Here is what you can do next...",
      start: {
        dateTime: now.toISOString(),
        timeZone: timeZone || "UTC",
      },
      end: {
        dateTime: new Date(now.getTime() + 5 * 60000).toISOString(),
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

    res.status(201).json({
      message: "User registered and welcome email triggered via Calendar.",
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

export default router;
// module.exports = router;
