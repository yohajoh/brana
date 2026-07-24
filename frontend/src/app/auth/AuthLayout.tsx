"use client";

import React, { PropsWithChildren } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  showBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  showBackLink = false,
  backHref = "/auth/login",
  backLabel,
  badge,
  icon,
}) => {
  const { t } = useLanguage();
  const resolvedBackLabel = backLabel ?? (t("auth.common.back_to_login") as string);
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* ── Background ─────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[#f8f7fc]" />
      {/* Navy blob top-right */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#142b6f]/06 blur-[100px] pointer-events-none" />
      {/* Gold blob bottom-left */}
      <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#f5c518]/08 blur-[90px] pointer-events-none" />
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #142b6f 1px, transparent 0)", backgroundSize: "30px 30px" }} />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-[#142b6f] shadow-[0_2px_10px_rgba(20,43,111,0.35)] group-hover:shadow-[0_4px_18px_rgba(20,43,111,0.45)] transition-shadow" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#f5c518] rounded-tr-lg rounded-bl-lg" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-sm select-none">ብ</span>
          </div>
          <span className="text-lg font-serif font-black text-[#142b6f]">ብራና</span>
        </Link>

        {showBackLink && (
          <Link href={backHref} className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] hover:text-[#142b6f] transition-colors">
            <ArrowLeft size={14} />
            {resolvedBackLabel}
          </Link>
        )}
      </header>

      {/* ── Centered card ───────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[520px]"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-[0_8px_48px_rgba(20,43,111,0.11)] border border-[#e2e0e7]/70 px-6 sm:px-12 py-8 sm:py-10">
            {/* Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#142b6f]/08 border border-[#142b6f]/12 px-3.5 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#142b6f]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#142b6f]">{badge}</span>
              </div>
            )}

            {/* Custom icon */}
            {icon && <div className="mb-6">{icon}</div>}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] leading-tight mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[#6b7280] leading-relaxed mb-8">{subtitle}</p>
            )}
            {!subtitle && <div className="mb-7" />}

            {children}
          </div>
        </motion.div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 py-5 text-center">
        <p className="text-xs text-[#9ca3af]">&copy; {new Date().getFullYear()} Birana Library — ASTU</p>
      </footer>
    </div>
  );
};

/* ─── Centered card layout — 70vw × 80vh — used by Login and Signup ──────── */

interface SplitAuthLayoutProps {
  imageSrc: string;
  imageTitle: string;
  imageTagline: string;
  imageStats?: Array<{ value: string; label: string }>;
  children: React.ReactNode;
  rightTitle: string;
  rightSubtitle?: string;
  badge?: string;
  topRight?: React.ReactNode;
}

export const SplitAuthLayout: React.FC<SplitAuthLayoutProps> = ({
  imageSrc,
  imageTitle,
  imageTagline,
  imageStats,
  children,
  rightTitle,
  rightSubtitle,
  badge,
  topRight,
}) => {
  const { t } = useLanguage();
  return (
    /*
     * Full-screen dark backdrop — card floats centered.
     * Background: very dark charcoal + two soft orbs.
     */
    <div className="min-h-screen w-full bg-white flex lg:items-center justify-center relative lg:overflow-hidden">

      {/* ── Background decoration ────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Navy orb — top left */}
        <div className="absolute -top-48 -left-48 w-[640px] h-[640px] rounded-full bg-[#142b6f]/06 blur-[120px]" />
        {/* Gold orb — bottom right */}
        <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-[#f5c518]/08 blur-[110px]" />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #142b6f 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      {/*
       * THE CARD
       *
       * DESKTOP (lg+):
       *   w-[70vw] h-[80vh] — 70% width, 80% height, fixed, scrolls inside
       *   Left = 40% image panel, Right = 60% form
       *
       * MOBILE (< lg):
       *   Full-screen, no image panel, form scrolls naturally
       */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full h-full lg:w-[70vw] lg:h-[80vh] lg:max-w-[1100px] flex flex-col lg:flex-row lg:rounded-[28px] overflow-hidden"
        style={{
          border: "1px solid rgba(20,43,111,0.10)",
          boxShadow: "0 40px 120px rgba(20,43,111,0.18), 0 16px 48px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >

        {/* ── LEFT PANEL: image — hidden on mobile, 40% on desktop ── */}
        <div className="relative hidden lg:flex lg:w-[40%] shrink-0 flex-col overflow-hidden">
          {/* Photo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageSrc})` }}
          />
          {/* Layered overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d]/70 via-[#142b6f]/40 to-[#0d0d0d]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/90 via-transparent to-transparent" />
          {/* Gold accent top stripe */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#f5c518]/80 via-[#f5c518] to-transparent" />

          {/* Logo */}
          <div className="relative z-10 p-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 shrink-0">
                <div className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.3)]" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-[#f5c518] rounded-tr-xl rounded-bl-lg" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-base select-none">ብ</span>
              </div>
              <span className="text-xl font-serif font-black text-white tracking-tight">ብራና</span>
            </Link>
          </div>

          {/* Bottom content */}
          <div className="relative z-10 mt-auto p-8">
            {imageStats && imageStats.length > 0 && (
              <div className="flex gap-5 mb-7">
                {imageStats.map(({ value, label }) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.45 }}>
                    <div className="text-xl font-serif font-black text-white leading-none">{value}</div>
                    <div className="text-[10px] text-white/50 font-semibold mt-1 uppercase tracking-wider">{label}</div>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="h-px bg-white/15 mb-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
              Birana Library · ASTU
            </p>
            <h2 className="text-xl font-serif font-black text-white leading-tight mb-2">{imageTitle}</h2>
            <p className="text-xs text-white/50 leading-relaxed">{imageTagline}</p>
          </div>
        </div>

        {/* ── RIGHT PANEL: form ─────────────────────────────────── */}
        {/* On mobile this IS the full card — no left panel */}
        <div className="relative flex-1 bg-[#f8f7fc] flex flex-col overflow-hidden min-h-screen lg:min-h-0">

          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#142b6f]/04 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#f5c518]/05 blur-3xl" />

          {/* Top bar */}
          <div className="relative z-10 shrink-0 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[#e2e0e7]/60">
            {/* Mobile: full logo. Desktop: just "Home" back link */}
            <Link href="/" className="flex items-center gap-2 lg:gap-1.5">
              {/* Mobile logo mark */}
              <div className="relative w-7 h-7 shrink-0 lg:hidden">
                <div className="absolute inset-0 rounded-lg bg-[#142b6f]" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#f5c518] rounded-tr-lg rounded-bl-md" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-xs select-none">ብ</span>
              </div>
              <span className="text-base font-serif font-black text-[#142b6f] lg:hidden">ብራና</span>
              {/* Desktop: text back link */}
              <span className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af] hover:text-[#142b6f] transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("auth.common.home") as string}
              </span>
            </Link>
            {topRight && <div>{topRight}</div>}
          </div>

          {/* Scrollable form — fills height, scrolls if content overflows */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="px-6 sm:px-8 py-7 max-w-[440px] mx-auto lg:max-w-none">
              {/* Badge */}
              {badge && (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#142b6f]/08 border border-[#142b6f]/12 px-3.5 py-1.5 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142b6f]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#142b6f]">{badge}</span>
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] leading-tight mb-1">
                {rightTitle}
              </h1>
              {rightSubtitle && (
                <p className="text-sm text-[#6b7280] leading-relaxed mb-6">{rightSubtitle}</p>
              )}
              {!rightSubtitle && <div className="mb-6" />}
              {children}
              <div className="h-8" />
            </div>
          </div>

          {/* Footer strip */}
          <div className="relative z-10 shrink-0 px-6 sm:px-8 py-3 border-t border-[#e2e0e7]/60">
            <p className="text-[10px] text-[#c0bfca]">
              &copy; {new Date().getFullYear()} Birana Library System — ASTU
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
