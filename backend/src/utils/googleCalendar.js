// utils/googleCalendar.js
// const { google } = require("googleapis");
import { google } from "googleapis";

function getCalendarClient(refreshToken) {
  if (!refreshToken) {
    throw new Error("Missing refresh token for Google Calendar client");
  }

  const redirectUri =
    process.env.CALENDAR_CALLBACK_URL ||
    process.env.CALLBACK_URL ||
    process.env.REDIRECT_URL ||
    undefined;

  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    redirectUri,
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// module.exports = { getCalendarClient };
export { getCalendarClient };
