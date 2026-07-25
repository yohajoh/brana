import nodemailer from "nodemailer";

// Build transporter lazily so it always reads the current env vars.
// Explicit timeouts prevent the connection from hanging indefinitely
// (which caused the 15s email_timeout in production).
const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    const missing = [
      !host && "EMAIL_HOST",
      !user && "EMAIL_USER",
      !pass && "EMAIL_PASS",
      !from && "EMAIL_FROM",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Email service misconfigured — missing env vars: ${missing}`);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: true,            // Resend requires SSL/TLS on port 465 — always true
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: false,
  });
};

export const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `Brana Library <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mail] ✅ Sent "${options.subject}" to ${options.email} — id: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Mail] ❌ Failed to send "${options.subject}" to ${options.email}:`, {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    throw error;
  }
};
