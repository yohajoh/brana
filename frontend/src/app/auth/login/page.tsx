"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SplitAuthLayout } from "../AuthLayout";
import { fetchApi, API_BASE_URL, seedCurrentUserCache } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const IC =
  "w-full rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#142b6f] focus:shadow-[0_0_0_3px_rgba(20,43,111,0.09)] transition-all";

type PublicStats = {
  data: { totalBooks: number; totalStudents: number; totalRentals: number; totalCategories: number };
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [showPw, setShowPw]       = useState(false);

  /* Real stats from the public API */
  const { data: statsData } = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => fetchApi("/public/stats"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const s = statsData?.data;

  const imageStats = [
    { value: s?.totalBooks    ? `${s.totalBooks.toLocaleString()}+`    : "…", label: t("stats_band.books")    as string },
    { value: s?.totalStudents ? `${s.totalStudents.toLocaleString()}+` : "…", label: t("stats_band.students") as string },
    { value: "4.9★", label: "Rating" },
  ];

  useEffect(() => {
    if (searchParams.get("confirmed") === "true")
      setSuccess(t("auth.login.messages.email_confirmed") as string);
    const err = searchParams.get("error");
    if (err === "auth_failed")           setError(t("auth.login.messages.google_failed")   as string);
    if (err === "auth_timeout")          setError(t("auth.login.messages.google_timeout")  as string);
    if (err === "google_not_configured") setError("Google sign-in is not configured on the server.");
    if (err === "google_callback_error") setError("Google sign-in failed. Please try again.");
  }, [searchParams, t]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); setError(null); setSuccess(null);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      const user = data?.data?.user ?? null;
      const role = user?.role ?? "STUDENT";

      // Seed the client-side user cache immediately so route guards get a
      // cache hit instead of racing a /auth/me request against Firefox's
      // cookie commit (which can lose the race and redirect back to login).
      if (user) seedCurrentUserCache(user);

      router.push(role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (t("auth.login.messages.invalid_credentials") as string));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SplitAuthLayout
      imageSrc="/hero img.jpg"
      imageTitle={`${t("hero.title_part1") as string} ${t("hero.title_italic") as string}`}
      imageTagline={t("hero.description") as string}
      imageStats={imageStats}
      rightTitle={t("auth.login.title") as string}
      rightSubtitle={t("auth.login.subtitle") as string}
      badge={t("auth.common.badge_welcome") as string}
      topRight={
        <Link
          href="/auth/create-account"
          className="text-xs font-semibold text-[#374151] hover:text-[#142b6f] transition-colors"
        >
          {t("auth.signup.already_registered") as string}{" "}
          <span className="text-[#142b6f] font-black underline underline-offset-2">
            {t("navbar.signup") as string}
          </span>
        </Link>
      }
    >
      {/* Google */}
      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
        className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm font-semibold text-[#0d0d0d] shadow-sm hover:shadow-[0_4px_16px_rgba(20,43,111,0.09)] hover:border-[#142b6f]/20 transition-all"
      >
        <FcGoogle size={20} />
        {t("auth.login.google_login") as string}
      </motion.button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6 text-[11px] text-[#b0afc0] font-semibold">
        <span className="h-px flex-1 bg-[#e2e0e7]" />
        {t("auth.login.or_continue_with") as string}
        <span className="h-px flex-1 bg-[#e2e0e7]" />
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-bold text-[#374151]">
            {t("auth.login.identity_label") as string}
          </label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            placeholder={t("auth.login.identity_placeholder") as string}
            className={IC}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-bold text-[#374151]">
              {t("auth.login.password_label") as string}
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] font-semibold text-[#142b6f] hover:opacity-75 transition-opacity"
            >
              {t("auth.login.forgot_password") as string}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password" name="password"
              type={showPw ? "text" : "password"}
              required autoComplete="current-password"
              placeholder={t("auth.login.password_placeholder") as string}
              className={`${IC} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0afc0] hover:text-[#374151] transition-colors"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-1 rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t("auth.login.submitting") as string}
            </span>
          ) : (
            t("auth.login.submit") as string
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-[#9ca3af]">
        {t("auth.signup.already_registered") as string}{" "}
        <Link href="/auth/create-account" className="font-black text-[#142b6f] hover:opacity-75 transition-opacity">
          {t("navbar.signup") as string}
        </Link>
      </p>
    </SplitAuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginContent />
    </Suspense>
  );
}
