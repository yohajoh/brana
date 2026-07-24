"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await fetchApi("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: fd.get("email") }),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (t("auth.forgot_password.messages.default_error") as string));
    } finally { setIsLoading(false); }
  };

  if (done) {
    return (
      <AuthLayout
        title={t("auth.forgot_password.modal.title") as string}
        badge="Email sent"
        icon={
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-14 h-14 rounded-2xl bg-[#142b6f]/08 border border-[#142b6f]/12 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#142b6f" strokeWidth="1.5" />
              <path d="M2 6l10 7 10-7" stroke="#142b6f" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        }
      >
        <p className="text-sm text-[#374151] leading-relaxed mb-8">
          {t("auth.forgot_password.modal.message") as string}
        </p>
        <Link href="/auth/login"
          className="block w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white text-center shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 transition-all">
          {t("auth.forgot_password.back_label") as string}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.forgot_password.title") as string}
      subtitle={t("auth.forgot_password.subtitle") as string}
      showBackLink
      backHref="/auth/login"
      backLabel={t("auth.forgot_password.back_label") as string}
      badge="Password reset"
    >
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-bold text-[#374151]">
            {t("auth.forgot_password.email_label") as string}
          </label>
          <input id="email" name="email" type="email" required autoComplete="email"
            placeholder={t("auth.forgot_password.email_placeholder") as string}
            className="w-full rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#142b6f] focus:shadow-[0_0_0_3px_rgba(20,43,111,0.09)] transition-all" />
        </div>

        <p className="text-xs text-[#9ca3af] leading-relaxed">
          {t("auth.forgot_password.help_text") as string}
        </p>

        <button type="submit" disabled={isLoading}
          className="w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t("auth.forgot_password.submitting") as string}
            </span>
          ) : t("auth.forgot_password.submit") as string}
        </button>
      </form>
    </AuthLayout>
  );
}
