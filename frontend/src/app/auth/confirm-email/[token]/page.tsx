"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/app/auth/AuthLayout";
import { fetchApi } from "@/lib/api";
import { notifyAuthChange } from "@/lib/auth";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";

export default function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await fetchApi(`/auth/confirm-email/${token}`);
        setStatus("success");
        notifyAuthChange("EMAIL_CONFIRMED");
        setTimeout(() => router.push("/auth/login?confirmed=true"), 3500);
      } catch (err: unknown) {
        setStatus("error");
        setServerMessage(err instanceof Error ? err.message : "");
      }
    })();
  }, [token, router]);

  const titles: Record<"loading" | "success" | "error", string> = {
    loading: t("auth.confirm_email.title_loading") as string,
    success: t("auth.confirm_email.title_success") as string,
    error:   t("auth.confirm_email.title_error")   as string,
  };

  const message = status === "success"
    ? t("auth.confirm_email.message_success") as string
    : status === "error"
      ? serverMessage || (t("auth.confirm_email.message_error") as string)
      : "";

  return (
    <AuthLayout
      title={titles[status]}
      subtitle={status === "loading" ? (t("auth.confirm_email.subtitle_loading") as string) : undefined}
      badge={t("auth.confirm_email.badge") as string}
      showBackLink={status === "error"}
      backHref="/auth/login"
      icon={
        status === "loading" ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-2xl bg-[#142b6f]/08 flex items-center justify-center"
            style={{ borderRadius: "14px" }}
          >
            <div className="w-7 h-7 rounded-full border-[3px] border-[#e2e0e7] border-t-[#142b6f]" />
          </motion.div>
        ) : status === "success" ? (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" stroke="#059669" strokeWidth="1.5" />
              <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#dc2626" strokeWidth="1.5" />
              <path d="M15 9l-6 6M9 9l6 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </motion.div>
        )
      }
    >
      {status !== "loading" && (
        <div className="space-y-3">
          <p className="text-sm text-[#374151] leading-relaxed mb-6">{message}</p>

          {status === "success" && (
            <>
              <Link href="/auth/login"
                className="block w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white text-center shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:-translate-y-0.5 transition-all">
                {t("auth.common.sign_in_now") as string}
              </Link>
              <p className="text-xs text-center text-[#9ca3af]">
                {t("auth.common.redirecting") as string}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <Link href="/auth/login"
                className="block w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white text-center shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:-translate-y-0.5 transition-all">
                {t("auth.common.back_to_login") as string}
              </Link>
              <Link href="/auth/create-account"
                className="block w-full rounded-2xl border border-[#e2e0e7] py-3.5 text-sm font-semibold text-[#374151] text-center hover:border-[#142b6f] hover:text-[#142b6f] transition-all">
                {t("auth.common.create_new_account") as string}
              </Link>
            </>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
