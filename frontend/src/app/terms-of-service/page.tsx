import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 lg:px-12">
        <h1 className="text-3xl font-serif font-bold text-primary sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-foreground/70">Last updated: April 2, 2026</p>

        <section className="mt-8 space-y-4 text-sm leading-7 sm:text-base">
          <p>
            These Terms of Service govern access to and use of Birana digital library services. By using the platform,
            you agree to these terms.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Eligibility and Accounts</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>You must provide accurate registration information.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
            <li>You are responsible for activity under your account.</li>
          </ul>

          <h2 className="pt-2 text-xl font-semibold text-primary">Acceptable Use</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the service only for lawful educational and library purposes.</li>
            <li>Do not attempt to disrupt, abuse, or gain unauthorized access to the platform.</li>
            <li>Respect borrowing periods, payment rules, and content ownership rights.</li>
          </ul>

          <h2 className="pt-2 text-xl font-semibold text-primary">Payments and Fees</h2>
          <p>
            Some services may involve rental fees, penalties, or other charges. Applicable amounts and due dates are
            shown in your account dashboard.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Service Availability</h2>
          <p>
            We aim to keep Birana available and reliable, but we do not guarantee uninterrupted access and may perform
            maintenance or updates when needed.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Limitation of Liability</h2>
          <p>
            To the maximum extent allowed by law, Birana is not liable for indirect or consequential losses arising from
            use of the platform.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Contact</h2>
          <p>For questions about these terms, contact hello@birana.com.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
