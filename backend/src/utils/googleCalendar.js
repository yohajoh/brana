// utils/googleCalendar.js
// const { google } = require("googleapis");
import { google } from "googleapis";

function getCalendarClient(refreshToken) {
  if (!refreshToken) {
    throw new Error("Missing refresh token for Google Calendar client");
  }

  // Use GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (preferred) with fallback to
  // the legacy CLIENT_ID/CLIENT_SECRET var names for backward compatibility.
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured");
  }

  // The redirect URI is not actually used during token refresh — only during the
  // initial authorisation code exchange. We still pass it to satisfy the OAuth2
  // client constructor, preferring the calendar-specific callback URL.
  const redirectUri =
    process.env.CALENDAR_CALLBACK_URL ||
    process.env.GOOGLE_CALENDAR_CALLBACK_URL ||
    process.env.CALLBACK_URL ||
    undefined;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// module.exports = { getCalendarClient };
export { getCalendarClient };
