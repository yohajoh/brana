import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 lg:px-12">
        <h1 className="text-3xl font-serif font-bold text-primary sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-foreground/70">Last updated: April 2, 2026</p>

        <section className="mt-8 space-y-4 text-sm leading-7 sm:text-base">
          <p>
            Birana respects your privacy. This Privacy Policy explains what information we collect, how we use it, and
            how we protect it when you use our digital library services.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Account details such as name, email address, and profile information.</li>
            <li>Library activity such as borrow history, reservations, and payment status.</li>
            <li>Technical information such as device type, browser, and usage logs.</li>
          </ul>

          <h2 className="pt-2 text-xl font-semibold text-primary">How We Use Information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To create and manage your account.</li>
            <li>To provide book rental, reservation, and digital reading features.</li>
            <li>To improve system reliability, security, and user experience.</li>
            <li>To communicate important account or service updates.</li>
          </ul>

          <h2 className="pt-2 text-xl font-semibold text-primary">Data Sharing</h2>
          <p>
            We do not sell personal data. We may share limited data with service providers who help us operate the
            platform, under confidentiality and security obligations.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Data Security</h2>
          <p>
            We use technical and organizational safeguards to protect your data. No system is perfectly secure, but we
            continuously improve protections against unauthorized access.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Your Rights</h2>
          <p>
            You may request access, correction, or deletion of your account data by contacting us at hello@birana.com.
          </p>

          <h2 className="pt-2 text-xl font-semibold text-primary">Contact</h2>
          <p>For privacy questions, contact us at hello@birana.com.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
