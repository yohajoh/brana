import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Brana Library",
  description: "Terms of Service for Brana Library digital services.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-8 lg:px-12">
        <h1 className="text-3xl font-serif font-bold text-primary sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-foreground/70">Last updated: July 25, 2026</p>
        <p className="mt-2 text-sm text-foreground/70">Effective date: July 25, 2026</p>

        <section className="mt-10 space-y-8 text-sm leading-7 sm:text-base text-foreground/90">

          {/* 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Brana Library
              (&ldquo;Brana&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated at{" "}
              <a href="https://brana.yohajoh.tech" className="text-primary underline underline-offset-2">
                brana.yohajoh.tech
              </a>
              . By registering an account or using any part of our platform, you agree to be bound by these Terms. If
              you do not agree, do not use the platform.
            </p>
          </div>

          {/* 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">2. Eligibility</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You must be at least 13 years old to use Brana.</li>
              <li>
                Full library membership (borrowing physical books) is available to registered students with a valid
                student ID.
              </li>
              <li>You must provide accurate, complete, and up-to-date registration information.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </div>

          {/* 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">3. Account Registration and Security</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                You may register using an email address and password, or via Google Sign-In. Both methods are equally
                valid.
              </li>
              <li>You must verify your email address before your account becomes active.</li>
              <li>
                You are responsible for maintaining the confidentiality of your password. Do not share your credentials
                with anyone.
              </li>
              <li>
                Notify us immediately at{" "}
                <a href="mailto:support@yohajoh.tech" className="text-primary underline underline-offset-2">
                  support@yohajoh.tech
                </a>{" "}
                if you suspect unauthorized access to your account.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that violate these Terms or that show signs of
                fraudulent activity.
              </li>
            </ul>
          </div>

          {/* 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">4. Library Services</h2>
            <h3 className="font-semibold text-foreground">4.1 Physical Book Rentals</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Borrowing is subject to availability and the limits set by the library configuration (maximum books per
                user and loan duration).
              </li>
              <li>
                Books must be returned by the due date shown in your dashboard. Due dates are also displayed in your
                confirmation email.
              </li>
              <li>
                Late returns incur a daily fine as configured by the library administrator. The current fine rate is
                displayed in your account dashboard.
              </li>
              <li>
                Outstanding fines must be paid before borrowing additional books. Unpaid fines may result in account
                suspension.
              </li>
              <li>You are responsible for returning books in the same condition as received.</li>
            </ul>
            <h3 className="font-semibold text-foreground mt-3">4.2 Reservations</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>You may join a reservation queue for books that are currently unavailable.</li>
              <li>
                When a book becomes available, you will be notified by email and in-app notification. You will have a
                limited window to collect the book, after which your reservation will expire.
              </li>
              <li>You may cancel your reservation at any time before it is fulfilled.</li>
            </ul>
            <h3 className="font-semibold text-foreground mt-3">4.3 Digital Books</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>Digital books are available for in-platform reading only.</li>
              <li>
                You may not download, copy, redistribute, or share digital book content outside the platform.
              </li>
              <li>Access to digital books may be subject to publisher licensing terms.</li>
            </ul>
          </div>

          {/* 5 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">5. Payments and Fees</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Rental fees and late return fines are processed through the Chapa payment gateway. By making a payment,
                you agree to Chapa&rsquo;s terms of service.
              </li>
              <li>All fees are denominated in Ethiopian Birr (ETB) unless otherwise stated.</li>
              <li>
                Payment amounts and applicable fees are clearly shown before you confirm any transaction. There are no
                hidden charges.
              </li>
              <li>
                Refunds are handled on a case-by-case basis. Contact us at{" "}
                <a href="mailto:support@yohajoh.tech" className="text-primary underline underline-offset-2">
                  support@yohajoh.tech
                </a>{" "}
                for refund requests.
              </li>
            </ul>
          </div>

          {/* 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">6. Google Services Integration</h2>
            <h3 className="font-semibold text-foreground">6.1 Google Sign-In</h3>
            <p>
              You may sign in using your Google account. By doing so, you authorize Brana to receive your name and
              email address from Google for the purpose of authentication. We request only the minimum permissions
              required.
            </p>
            <h3 className="font-semibold text-foreground mt-3">6.2 Google Calendar (Optional)</h3>
            <p>
              You may optionally connect your Google Calendar from Account Settings. This allows Brana to create
              calendar events (such as book due date reminders) on your behalf. You may disconnect this integration at
              any time, which immediately revokes our access to your calendar. Connecting Google Calendar does not grant
              Brana access to read or modify your existing calendar events.
            </p>
          </div>

          {/* 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Use the platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>
                Attempt to gain unauthorized access to any part of the platform, its servers, or its databases.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the platform or its services.
              </li>
              <li>
                Impersonate another person or entity, or misrepresent your affiliation with any person or entity.
              </li>
              <li>
                Upload, transmit, or distribute any harmful, offensive, or illegal content through the platform.
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or extract source code from any part of the platform.
              </li>
            </ul>
          </div>

          {/* 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">8. Intellectual Property</h2>
            <p>
              All content, design, trademarks, and software on the Brana platform are the property of Brana Library or
              its licensors and are protected by applicable intellectual property laws. You may not reproduce, modify,
              distribute, or create derivative works without our explicit written permission.
            </p>
            <p>
              Physical and digital book content remains the property of the respective authors and publishers.
            </p>
          </div>

          {/* 9 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">9. Account Termination</h2>
            <p>
              You may delete your account at any time from Account Settings. Upon deletion, your personal data will be
              removed in accordance with our{" "}
              <a href="/privacy-policy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </a>
              .
            </p>
            <p>
              We may suspend or terminate your account if you violate these Terms, fail to pay outstanding fines, or
              engage in activity that poses a risk to the platform or other users. We will notify you by email before
              taking such action unless the violation is severe or illegal.
            </p>
          </div>

          {/* 10 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">10. Disclaimers</h2>
            <p>
              Brana is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
              express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free of
              viruses or other harmful components. We reserve the right to modify, suspend, or discontinue any part of
              the platform at any time without notice.
            </p>
          </div>

          {/* 11 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Brana Library shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss
              of profits, or loss of service, arising from your use of or inability to use the platform, even if we
              have been advised of the possibility of such damages.
            </p>
          </div>

          {/* 12 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">12. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Federal Democratic Republic
              of Ethiopia. Any disputes arising from these Terms shall be subject to the jurisdiction of the courts of
              Ethiopia.
            </p>
          </div>

          {/* 13 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">13. Changes to These Terms</h2>
            <p>
              We may revise these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top of this page
              will reflect the most recent revision. We will notify registered users of material changes via email or
              in-platform notice. Your continued use of the platform after changes take effect constitutes acceptance of
              the revised Terms.
            </p>
          </div>

          {/* 14 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">14. Contact Us</h2>
            <p>
              For questions about these Terms of Service, please contact us:
            </p>
            <address className="not-italic pl-4 border-l-2 border-border text-foreground/80">
              Brana Library<br />
              Email:{" "}
              <a href="mailto:support@yohajoh.tech" className="text-primary underline underline-offset-2">
                support@yohajoh.tech
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
