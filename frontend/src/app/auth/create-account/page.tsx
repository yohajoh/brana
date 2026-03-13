"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import { fetchApi } from "@/lib/api";
import { useAuthListener } from "@/lib/auth";
import { AuthModal } from "@/components/ui/AuthModal";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function CreateAccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
      setError(t("auth.signup.messages.password_mismatch"));
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
      setError(err instanceof Error ? err.message : t("auth.signup.messages.signup_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title={t("auth.signup.title")}
        subtitle={t("auth.signup.subtitle")}
        showBackLink
        backHref="/auth/login"
        backLabel={t("auth.signup.back_label")}
        imageSrc="/auth/image copy.png"
        imageAlt={t("auth.signup.image_alt") || "Colorful stack of spiritual books"}
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
              {t("auth.signup.full_name_label")}
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.full_name_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="year" className="text-xs font-medium text-[#3B2718]">
              {t("auth.signup.year_label")}
            </label>
            <input
              id="year"
              name="year"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.year_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="department" className="text-xs font-medium text-[#3B2718]">
              {t("auth.signup.department_label")}
            </label>
            <input
              id="department"
              name="department"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.department_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="studentId"
              className="text-xs font-medium text-[#3B2718]"
            >
              {t("auth.signup.id_label")}
            </label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.id_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-[#3B2718]">
              {t("auth.signup.phone_label")}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.phone_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[#3B2718]">
              {t("auth.signup.email_label")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.email_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[#3B2718]"
            >
              {t("auth.signup.password_label")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.password_placeholder")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-[#3B2718]"
            >
              {t("auth.signup.confirm_password_label")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="w-full rounded-xl border border-[#D2BFA3] bg-white px-3 py-2.5 text-sm text-[#3B2718] placeholder:text-[#B09776] outline-none focus:border-[#7A4A1D] focus:ring-2 focus:ring-[#E1C6A1] transition"
              placeholder={t("auth.signup.confirm_password_placeholder")}
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
              {t("auth.signup.terms_agree", {
                terms: `<span class="text-[#4A2B0B] hover:text-[#754019]">${t("auth.signup.terms_label")}</span>`,
                privacy: `<span class="text-[#4A2B0B] hover:text-[#754019]">${t("auth.signup.privacy_label")}</span>`,
              })}
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#4A2B0B] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(74,43,11,0.35)] hover:bg-[#5B3410] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79E6C] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? t("auth.signup.submitting") : t("auth.signup.submit")}
          </button>
        </form>

        <p className="pt-4 text-center text-xs text-[#8B6B4A]">
          {t("auth.signup.already_registered")}{" "}
          <Link
            href="/auth/login"
            className="font-medium text-[#4A2B0B] hover:text-[#754019] transition-colors"
          >
            {t("auth.signup.signin_link")}
          </Link>
        </p>
      </AuthLayout>

      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("auth.signup.modal.title")}
        message={t("auth.signup.modal.message")}
      />
    </>
  );
}
