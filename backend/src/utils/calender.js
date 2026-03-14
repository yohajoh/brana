// Backward-compatible shim for the misspelled path.
// module.exports = require("./googleCalendar");
import { getCalendarClient } from "../utils/googleCalendar.js";
export default getCalendarClient;
