"use client";

import { FormEvent, useState, use } from "react";
import Link from "next/link";
import { AuthLayout } from "@/app/auth/AuthLayout";
import { fetchApi } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const IC = "w-full rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#142b6f] focus:shadow-[0_0_0_3px_rgba(20,43,111,0.09)] transition-all";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showNew, setShowNew]     = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [done, setDone]           = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get("newPassword") as string;
    if (password !== fd.get("confirmPassword")) {
      setError("Passwords do not match."); setIsLoading(false); return;
    }
    try {
      await fetchApi(`/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password. The link may have expired.");
    } finally { setIsLoading(false); }
  };

  if (done) {
    return (
      <AuthLayout title="Password updated!" badge="Success"
        icon={
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z" stroke="#059669" strokeWidth="1.5" />
              <path d="M8 12l3 3 5-5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        }
      >
        <p className="text-sm text-[#374151] leading-relaxed mb-8">
          Your password has been changed successfully. You can now sign in with your new password.
        </p>
        <Link href="/auth/login"
          className="block w-full rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white text-center shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 transition-all">
          Sign in now
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password"
      subtitle="Choose a strong password to keep your Brana account secure."
      showBackLink backHref="/auth/login" backLabel="Back to login"
      badge="New password">
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-xs font-bold text-[#374151]">New password</label>
          <div className="relative">
            <input id="newPassword" name="newPassword" type={showNew ? "text" : "password"} required minLength={6}
              placeholder="Create a strong password" className={`${IC} pr-11`} />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0afc0] hover:text-[#374151] transition-colors">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-bold text-[#374151]">Confirm new password</label>
          <div className="relative">
            <input id="confirmPassword" name="confirmPassword" type={showCf ? "text" : "password"} required minLength={6}
              placeholder="Repeat your new password" className={`${IC} pr-11`} />
            <button type="button" onClick={() => setShowCf(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0afc0] hover:text-[#374151] transition-colors">
              {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-[#9ca3af]">Use at least 6 characters. Never share your password with anyone.</p>
        <button type="submit" disabled={isLoading}
          className="w-full mt-1 rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </span>
          ) : "Save new password"}
        </button>
      </form>
    </AuthLayout>
  );
}
