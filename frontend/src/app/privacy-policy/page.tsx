import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Brana Library",
  description: "Privacy Policy for Brana Library digital services.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-8 lg:px-12">
        <h1 className="text-3xl font-serif font-bold text-primary sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-foreground/70">Last updated: July 25, 2026</p>
        <p className="mt-2 text-sm text-foreground/70">
          Effective date: July 25, 2026
        </p>

        <section className="mt-10 space-y-8 text-sm leading-7 sm:text-base text-foreground/90">

          {/* 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">1. Introduction</h2>
            <p>
              Brana Library (&ldquo;Brana&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates
              the digital library platform available at{" "}
              <a href="https://brana.yohajoh.tech" className="text-primary underline underline-offset-2">
                brana.yohajoh.tech
              </a>
              . This Privacy Policy describes how we collect, use, disclose, and safeguard your personal information
              when you use our services. By accessing or using Brana, you agree to the practices described in this
              policy.
            </p>
          </div>

          {/* 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">2. Data Controller</h2>
            <p>
              Brana Library is the data controller for personal information collected through this platform. For
              privacy-related inquiries, contact us at:
            </p>
            <address className="not-italic pl-4 border-l-2 border-border text-foreground/80">
              Brana Library<br />
              Email:{" "}
              <a href="mailto:privacy@yohajoh.tech" className="text-primary underline underline-offset-2">
                privacy@yohajoh.tech
              </a>
              <br />
              Website:{" "}
              <a href="https://brana.yohajoh.tech" className="text-primary underline underline-offset-2">
                https://brana.yohajoh.tech
              </a>
            </address>
          </div>

          {/* 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">3. Information We Collect</h2>
            <p>We collect the following categories of personal information:</p>
            <h3 className="font-semibold text-foreground">a) Information you provide directly</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>Full name and email address when you register an account.</li>
              <li>Student ID, year of study, department, and phone number for library membership.</li>
              <li>Password (stored in hashed form — never stored in plain text).</li>
              <li>Payment details processed through Chapa payment gateway. We do not store raw card numbers.</li>
              <li>Reviews, wishlist items, and reading preferences you add to the platform.</li>
            </ul>
            <h3 className="font-semibold text-foreground">b) Information collected automatically</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>IP address, browser type, operating system, and device information.</li>
              <li>Usage logs including pages visited, features used, and session duration.</li>
              <li>Borrowing history, reservation activity, and fine records.</li>
            </ul>
            <h3 className="font-semibold text-foreground">c) Information from Google Sign-In</h3>
            <p>
              If you choose to sign in using Google, we receive your name, email address, and profile picture from
              Google as part of the authentication flow. We request only the minimum scopes necessary
              (<code className="text-xs bg-muted px-1 py-0.5 rounded">profile</code> and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code>). We do not access your Google
              account beyond what you explicitly authorize.
            </p>
            <h3 className="font-semibold text-foreground">d) Google Calendar data (optional)</h3>
            <p>
              If you optionally connect your Google Calendar from Account Settings, we request the{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                https://www.googleapis.com/auth/calendar.events
              </code>{" "}
              scope. This allows us to create calendar events on your behalf — specifically, book due date reminders and
              reservation availability alerts. We:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Only write events; we never read, modify, or delete your existing calendar events.</li>
              <li>Store only your OAuth refresh token, encrypted, to perform this function.</li>
              <li>Never share your calendar data with third parties.</li>
              <li>
                You can disconnect Google Calendar at any time from Account Settings, which immediately revokes our
                access.
              </li>
            </ul>
            <p>
              Use of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </div>

          {/* 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">4. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>To create and manage your library account and authenticate your identity.</li>
              <li>To process book rentals, reservations, and payments.</li>
              <li>To send transactional emails including account confirmation, borrow confirmations, overdue reminders, and reservation notifications.</li>
              <li>To create optional Google Calendar reminders for book due dates and reservation windows (only if you connect Google Calendar).</li>
              <li>To calculate and track late return fines as defined in the system configuration.</li>
              <li>To provide customer support and respond to your requests.</li>
              <li>To improve platform performance, fix bugs, and develop new features.</li>
              <li>To comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </div>

          {/* 5 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">5. Legal Basis for Processing</h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Contract performance:</strong> processing necessary to provide the library services you requested.</li>
              <li><strong>Legitimate interests:</strong> operating, securing, and improving the platform.</li>
              <li><strong>Consent:</strong> optional features such as Google Calendar integration, where you explicitly authorize access.</li>
              <li><strong>Legal obligation:</strong> compliance with applicable laws and regulations.</li>
            </ul>
          </div>

          {/* 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal data. We share limited information only in the following circumstances:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Service providers:</strong> third-party providers that help us operate the platform, including
                Neon (database hosting), Cloudinary (image storage), Resend (email delivery), Chapa (payment
                processing), and Render (server hosting). Each is bound by confidentiality obligations.
              </li>
              <li>
                <strong>Google:</strong> when you use Google Sign-In or connect Google Calendar, data is exchanged with
                Google in accordance with their{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Legal requirements:</strong> if required by law, court order, or to protect the rights, property,
                or safety of Brana, our users, or the public.
              </li>
            </ul>
          </div>

          {/* 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">7. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services. If
              you delete your account, we will delete your personal data within 30 days, except where retention is
              required by law (for example, payment records for financial compliance).
            </p>
            <p>
              Borrowing history and fine records may be retained for up to 2 years for auditing purposes.
            </p>
          </div>

          {/* 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">8. Cookies and Local Storage</h2>
            <p>
              We use a session cookie named <code className="text-xs bg-muted px-1 py-0.5 rounded">token</code> to
              maintain your authenticated session. This is a strictly necessary cookie — without it, you cannot remain
              logged in. We do not use advertising, analytics, or tracking cookies.
            </p>
            <p>
              We use browser localStorage to save your language preference. No personal data is stored in localStorage.
            </p>
          </div>

          {/* 9 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">9. Data Security</h2>
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>HTTPS encryption for all data in transit.</li>
              <li>Bcrypt password hashing — plaintext passwords are never stored.</li>
              <li>JWT-based session authentication with configurable expiry.</li>
              <li>Database access restricted to the application backend only.</li>
              <li>OAuth refresh tokens stored in the database — never transmitted to the frontend.</li>
            </ul>
            <p>
              No system is perfectly secure. In the event of a data breach affecting your rights, we will notify
              affected users as required by applicable law.
            </p>
          </div>

          {/* 10 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">10. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> update inaccurate or incomplete information via Account Settings or by contacting us.</li>
              <li><strong>Deletion:</strong> request deletion of your account and associated data.</li>
              <li><strong>Withdrawal of consent:</strong> disconnect Google Calendar at any time from Account Settings, which immediately stops our access to your calendar.</li>
              <li><strong>Data portability:</strong> request your data in a structured, machine-readable format.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@yohajoh.tech" className="text-primary underline underline-offset-2">
                privacy@yohajoh.tech
              </a>
              . We will respond within 30 days.
            </p>
          </div>

          {/* 11 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">11. Children&rsquo;s Privacy</h2>
            <p>
              Brana Library is intended for university students and is not directed at children under the age of 13. We
              do not knowingly collect personal information from children under 13. If we become aware that such data has
              been collected, we will delete it promptly.
            </p>
          </div>

          {/* 12 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will update the
              &ldquo;Last updated&rdquo; date at the top of this page and, where appropriate, notify you by email or
              through the platform.
            </p>
          </div>

          {/* 13 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:
            </p>
            <address className="not-italic pl-4 border-l-2 border-border text-foreground/80">
              Brana Library<br />
              Email:{" "}
              <a href="mailto:privacy@yohajoh.tech" className="text-primary underline underline-offset-2">
                privacy@yohajoh.tech
              </a>
              <br />
              Website:{" "}
              <a href="https://brana.yohajoh.tech" className="text-primary underline underline-offset-2">
                https://brana.yohajoh.tech
              </a>
            </address>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
