"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import { fetchApi } from "@/lib/api";
import { useAuthListener } from "@/lib/auth";
import { AuthModal } from "@/components/ui/AuthModal";

export default function CreateAccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Listen for email confirmation from another tab
  useAuthListener((type) => {
    if (type === "EMAIL_CONFIRMED") {
      setShowModal(false);
      router.push("/auth/login?confirmed=true");
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("fullName") as string;
    const year = formData.get("year") as string;
    const studentId = formData.get("studentId") as string;
    const phone = formData.get("phone") as string;
    const department = formData.get("department") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await fetchApi("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          year,
          student_id: studentId,
          phone,
          department,
        }),
      });
      setShowModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title="Create an account"
        subtitle="Already have an account? Log in"
        showBackLink
        backHref="/auth/login"
        backLabel="Already have an account? Sign in"
        imageSrc="/auth/image copy.png"
        imageAlt="Colorful stack of spiritual books"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100 italic">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="text-xs font-medium text-[#3B2718]"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="year" className="text-xs font-medium text-[#3B2718]">
              Year
            </label>
            <input
              id="year"
              name="year"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="e.g. 3rd year"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="department" className="text-xs font-medium text-[#3B2718]">
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="studentId"
              className="text-xs font-medium text-[#3B2718]"
            >
              Id no.
            </label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="Enter your ID"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-[#3B2718]">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="+2519XXXXXXXX"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[#3B2718]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="you@astu.edu.et"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[#3B2718]"
            >
              Enter Your Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="Create a strong password"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-[#3B2718]"
            >
              Confirm Your Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder="Confirm your password"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-3.5 w-3.5 rounded border-[#C4AF90] bg-transparent accent-[#4A2B0B] focus:ring-0"
            />
            <label
              htmlFor="terms"
              className="text-xs text-[#8B6B4A] leading-snug cursor-pointer"
            >
              I agree to the{" "}
              <span className="text-[#4A2B0B] hover:text-[#754019]">
                terms of use
              </span>{" "}
              and{" "}
              <span className="text-[#4A2B0B] hover:text-[#754019]">
                privacy policy
              </span>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="pt-4 text-center text-xs text-[#8B6B4A]">
          Already registered?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-[#4A2B0B] hover:text-[#754019] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </AuthLayout>

      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Check your email"
        message="We've sent a confirmation link to your email address. Please follow the link to activate your account. This tab will automatically redirect once confirmed."
      />
    </>
  );
}
