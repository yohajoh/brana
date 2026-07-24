"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SplitAuthLayout } from "../AuthLayout";
import { fetchApi, API_BASE_URL } from "@/lib/api";
import { useAuthListener } from "@/lib/auth";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const IC = "w-full rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#142b6f] focus:shadow-[0_0_0_3px_rgba(20,43,111,0.09)] transition-all";

type PublicStats = {
  data: { totalBooks: number; totalStudents: number; totalCategories: number };
};

export default function CreateAccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [done, setDone]           = useState(false);

  // Real stats
  const { data: statsData } = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => fetchApi("/public/stats"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const s = statsData?.data;

  const imageStats = [
    { value: s?.totalBooks      ? `${s.totalBooks.toLocaleString()}+`      : "…", label: t("stats_band.books")      as string },
    { value: "Free",                                                               label: t("cta_section.loan_period") as string },
    { value: s?.totalCategories ? `${s.totalCategories}` : "…",                   label: t("stats_band.categories")  as string },
  ];

  useAuthListener((type) => {
    if (type === "EMAIL_CONFIRMED") router.push("/auth/login?confirmed=true");
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    if (password !== fd.get("confirmPassword")) {
      setError(t("auth.signup.messages.password_mismatch") as string);
      setIsLoading(false); return;
    }
    try {
      await fetchApi("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("fullName"), email: fd.get("email"), password,
          year: fd.get("year"), student_id: fd.get("studentId"),
          phone: fd.get("phone"), department: fd.get("department"),
        }),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (t("auth.signup.messages.signup_failed") as string));
    } finally { setIsLoading(false); }
  };

  /* ── Success screen ─── */
  if (done) {
    return (
      <SplitAuthLayout
        imageSrc="/reading img 9.jpg"
        imageTitle={t("hero.title_part1") as string}
        imageTagline={t("hero.description") as string}
        imageStats={imageStats}
        rightTitle={t("auth.forgot_password.modal.title") as string}
        rightSubtitle={t("auth.signup.messages.check_email") as string}
        badge={t("auth.common.badge_almost") as string}
      >
        <div className="flex flex-col items-center text-center py-4">
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-16 h-16 rounded-2xl bg-[#142b6f]/08 border border-[#142b6f]/12 flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#142b6f" strokeWidth="1.5" />
              <path d="M2 6l10 7 10-7" stroke="#142b6f" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
          <p className="text-sm text-[#374151] leading-relaxed mb-8">
            {t("auth.forgot_password.modal.message") as string}
          </p>
          <Link href="/auth/login"
            className="w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white text-center shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:-translate-y-0.5 transition-all">
            {t("auth.common.back_to_login") as string}
          </Link>
        </div>
      </SplitAuthLayout>
    );
  }

  return (
    <SplitAuthLayout
      imageSrc="/reading img 9.jpg"
      imageTitle={t("hero.title_part1") as string}
      imageTagline={t("hero.description") as string}
      imageStats={imageStats}
      rightTitle={t("auth.signup.title") as string}
      rightSubtitle={t("auth.signup.subtitle") as string}
      badge={t("auth.common.badge_new_account") as string}
      topRight={
        <Link href="/auth/login" className="text-xs font-semibold text-[#374151] hover:text-[#142b6f] transition-colors">
          {t("auth.signup.already_registered") as string}{" "}
          <span className="text-[#142b6f] font-black underline underline-offset-2">
            {t("auth.signup.signin_link") as string}
          </span>
        </Link>
      }
    >
      {/* Google */}
      <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
        onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
        className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm font-semibold text-[#0d0d0d] shadow-sm hover:shadow-[0_4px_16px_rgba(20,43,111,0.09)] hover:border-[#142b6f]/20 transition-all">
        <FcGoogle size={20} />
        {t("auth.login.google_login") as string}
      </motion.button>

      <div className="flex items-center gap-3 my-5 text-[11px] text-[#b0afc0] font-semibold">
        <span className="h-px flex-1 bg-[#e2e0e7]" />
        {t("auth.login.or_continue_with") as string}
        <span className="h-px flex-1 bg-[#e2e0e7]" />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-xs font-bold text-[#374151]">{t("auth.signup.full_name_label") as string}</label>
            <input id="fullName" name="fullName" required autoComplete="name"
              placeholder={t("auth.signup.full_name_placeholder") as string} className={IC} />
          </div>
          <div className="space-y-1">
            <label htmlFor="studentId" className="text-xs font-bold text-[#374151]">{t("auth.signup.id_label") as string}</label>
            <input id="studentId" name="studentId" required
              placeholder={t("auth.signup.id_placeholder") as string} className={IC} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="year" className="text-xs font-bold text-[#374151]">{t("auth.signup.year_label") as string}</label>
            <input id="year" name="year" required placeholder={t("auth.signup.year_placeholder") as string} className={IC} />
          </div>
          <div className="space-y-1">
            <label htmlFor="department" className="text-xs font-bold text-[#374151]">{t("auth.signup.department_label") as string}</label>
            <input id="department" name="department" required placeholder={t("auth.signup.department_placeholder") as string} className={IC} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="phone" className="text-xs font-bold text-[#374151]">{t("auth.signup.phone_label") as string}</label>
            <input id="phone" name="phone" type="tel" required placeholder={t("auth.signup.phone_placeholder") as string} className={IC} />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-bold text-[#374151]">{t("auth.signup.email_label") as string}</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              placeholder={t("auth.signup.email_placeholder") as string} className={IC} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold text-[#374151]">{t("auth.signup.password_label") as string}</label>
            <div className="relative">
              <input id="password" name="password" type={showPw ? "text" : "password"} required minLength={6}
                placeholder={t("auth.signup.password_placeholder") as string} className={`${IC} pr-10`} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0afc0] hover:text-[#374151] transition-colors">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-xs font-bold text-[#374151]">{t("auth.signup.confirm_password_label") as string}</label>
            <div className="relative">
              <input id="confirmPassword" name="confirmPassword" type={showCf ? "text" : "password"} required minLength={6}
                placeholder={t("auth.signup.confirm_password_placeholder") as string} className={`${IC} pr-10`} />
              <button type="button" onClick={() => setShowCf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0afc0] hover:text-[#374151] transition-colors">
                {showCf ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full mt-1 rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t("auth.signup.submitting") as string}
            </span>
          ) : t("auth.signup.submit") as string}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[#9ca3af]">
        {t("auth.signup.already_registered") as string}{" "}
        <Link href="/auth/login" className="font-black text-[#142b6f] hover:opacity-75 transition-opacity">
          {t("auth.signup.signin_link") as string}
        </Link>
      </p>
    </SplitAuthLayout>
  );
}
