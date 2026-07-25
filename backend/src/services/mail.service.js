import { Resend } from "resend";

// Use Resend's HTTP API instead of SMTP.
// SMTP (ports 465/587) is blocked by Render and most cloud platforms.
// The HTTP API goes over port 443 (HTTPS) which is always open.
const getResendClient = () => {
  const apiKey = process.env.EMAIL_PASS || process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email service misconfigured — missing RESEND_API_KEY or EMAIL_PASS env var");
  }
  return new Resend(apiKey);
};

export const sendEmail = async (options) => {
  const resend = getResendClient();

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("Email service misconfigured — missing EMAIL_FROM env var");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Brana Library <${from}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    if (error) {
      console.error(`[Mail] ❌ Resend API error sending to ${options.email}:`, error);
      throw new Error(error.message || "Resend API returned an error");
    }

    console.log(`[Mail] ✅ Sent "${options.subject}" to ${options.email} — id: ${data?.id}`);
    return data;
  } catch (err) {
    console.error(`[Mail] ❌ Failed to send "${options.subject}" to ${options.email}:`, {
      message: err?.message,
      name: err?.name,
    });
    throw err;
  }
};
