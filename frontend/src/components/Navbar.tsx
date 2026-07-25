"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AdminNotificationDropdown } from "@/components/notifications/AdminNotificationDropdown";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";
import { motion, AnimatePresence } from "framer-motion";

type LanguageCode = "en" | "am" | "or";

const NavPill = () => (
  <motion.span
    layoutId="nav-pill"
    className="absolute inset-0 rounded-full bg-[#0d0d0d] z-0"
    transition={{ type: "spring", stiffness: 420, damping: 38 }}
  />
);

export const Navbar = () => {
  const pathname = usePathname();
  const { user } = usePersona();
  const { language, setLanguage, t } = useLanguage();
  const [isLangOpen, setIsLangOpen]     = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const langRef    = useRef<HTMLDivElement>(null);
  const mobileRef  = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const { toggleMobileSidebar } = useDashboardShell();

  const isStudentDashboard = pathname.startsWith("/dashboard/student");
  const isAdminDashboard   = pathname.startsWith("/dashboard/admin");
  const isDashboard        = pathname.startsWith("/dashboard/");

  /* Track scroll — 60px threshold */
  useEffect(() => {
    if (isDashboard) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDashboard]);

  /* Close on outside click — exclude the hamburger button itself */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
      if (
        mobileRef.current &&
        !mobileRef.current.contains(e.target as Node) &&
        !hamburgerRef.current?.contains(e.target as Node)
      ) setIsMobileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => { setIsMobileOpen(false); }, [pathname]);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const languages: Array<{ code: LanguageCode; label: string; short: string }> = [
    { code: "en", label: "English",  short: "EN" },
    { code: "am", label: "አማርኛ",    short: "አማ" },
    { code: "or", label: "Oromiffa", short: "OR" },
  ];

  const navLinks = [
    { href: "/",      label: t("navbar.home")  as string },
    { href: "/books", label: t("navbar.books") as string },
    { href: "/about", label: t("navbar.about") as string },
  ];

  /* ══════════════════════════════════════════════════════════
     DASHBOARD HEADER
  ══════════════════════════════════════════════════════════ */
  if (isDashboard) {
    return (
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-[70] border-b border-[#e2e0e7]/50 bg-white/85 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <button type="button" onClick={toggleMobileSidebar}
            className="lg:hidden grid place-items-center w-8 h-8 rounded-lg border border-[#e2e0e7] text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-all"
            aria-label="Open sidebar"><Menu size={16} /></button>

          <div className="hidden lg:flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-[#374151] tracking-wide">
              {isAdminDashboard ? "Admin Dashboard" : "Student Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative" ref={langRef}>
              <button onClick={() => setIsLangOpen(v => !v)}
                className="flex items-center gap-1 rounded-lg border border-[#e2e0e7] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#374151] hover:border-[#0d0d0d] transition-all">
                {languages.find(l => l.code === language)?.short ?? language.toUpperCase()}
                <ChevronDown size={11} className={`transition-transform ${isLangOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }} transition={{ duration: 0.16, ease: [0.16,1,0.3,1] }}
                    className="absolute right-0 top-full mt-2 w-32 bg-white border border-[#e2e0e7] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] p-1 z-50">
                    {languages.map(lang => (
                      <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                        className={`w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors
                          ${language === lang.code ? "bg-[#0d0d0d]/08 text-[#0d0d0d]" : "text-[#374151] hover:bg-[#f8f7fb]"}`}>
                        <span className="text-[10px] font-black opacity-50">{lang.short}</span>
                        {lang.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isStudentDashboard && <NotificationDropdown />}
            {isAdminDashboard   && <AdminNotificationDropdown />}
            {user               && <PersonaSwitcher />}
          </div>
        </div>
      </header>
    );
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC HEADER — transparent → white on scroll
     Position: fixed so hero image scrolls beneath it
  ══════════════════════════════════════════════════════════ */
  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        scrolled
          ? "bg-white/97 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_24px_rgba(0,0,0,0.07)]"
          : "bg-transparent"
      }`}>
        {/* Gold accent line — always present, fades with scroll */}
        <div className={`h-[2px] w-full bg-gradient-to-r from-[#f5c518]/70 via-[#f5c518] to-transparent transition-opacity duration-400 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ────────────────────────────────── */}
            <Link href="/" className="group flex items-center gap-3 shrink-0">
              <div className="relative w-9 h-9 shrink-0">
                <div className={`absolute inset-0 rounded-xl transition-all duration-400 ${
                  scrolled
                    ? "bg-[#0d0d0d] shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
                    : "bg-white/15 backdrop-blur-md border border-white/25 shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                }`} />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#f5c518] rounded-tr-xl rounded-bl-lg" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-base leading-none select-none z-10">ብ</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className={`text-lg font-serif font-black tracking-tight transition-colors duration-400 ${
                  scrolled ? "text-[#0d0d0d]" : "text-white"
                }`}>ብራና</span>
                <span className={`text-[9px] font-bold tracking-[0.15em] uppercase transition-colors duration-400 ${
                  scrolled ? "text-[#6b7280]" : "text-white/55"
                }`}>Library</span>
              </div>
            </Link>

            {/* ── Nav pill container ─────────────────── */}
            <nav className="hidden md:flex items-center">
              <div className={`flex items-center gap-0.5 rounded-full p-1 border transition-all duration-400 ${
                scrolled
                  ? "bg-[#f1f0f4]/80 backdrop-blur-sm border-[#e2e0e7]/60"
                  : "bg-white/10 backdrop-blur-sm border-white/20"
              }`}>
                {navLinks.map(link => {
                  const active = isActive(link.href);
                  return (
                    <Link key={link.href} href={link.href}
                      className={`relative rounded-full px-5 py-2 text-sm font-bold transition-colors duration-200 z-0 ${
                        active
                          ? "text-white"
                          : scrolled
                            ? "text-[#374151] hover:text-[#0d0d0d]"
                            : "text-white/80 hover:text-white"
                      }`}>
                      {active && <NavPill />}
                      <span className="relative z-10">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* ── Right actions ──────────────────────── */}
            <div className="flex items-center gap-2.5">

              {/* Language */}
              <div className="relative hidden sm:block" ref={langRef}>
                <button onClick={() => setIsLangOpen(v => !v)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold transition-all border ${
                    scrolled
                      ? "text-[#374151] hover:text-[#0d0d0d] border-transparent hover:border-[#e2e0e7]"
                      : "text-white/75 hover:text-white border-transparent hover:border-white/30"
                  }`}>
                  {languages.find(l => l.code === language)?.short ?? language.toUpperCase()}
                  <ChevronDown size={11} className={`transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.18, ease: [0.16,1,0.3,1] }}
                      className="absolute right-0 top-full mt-2 w-36 bg-white/95 backdrop-blur-xl border border-[#e2e0e7] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 z-50 overflow-hidden">
                      {languages.map((lang, i) => (
                        <motion.button key={lang.code} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all
                            ${language === lang.code ? "bg-[#0d0d0d] text-white" : "text-[#374151] hover:bg-[#f8f7fb] hover:text-[#0d0d0d]"}`}>
                          <span className={`text-[10px] font-black w-5 shrink-0 ${language === lang.code ? "text-[#f5c518]" : "text-[#9ca3af]"}`}>
                            {lang.short}
                          </span>
                          {lang.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Auth buttons */}
              {user ? (
                <PersonaSwitcher />
              ) : (
                <>
                  <Link href="/auth/login"
                    className={`hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                      scrolled
                        ? "text-[#0d0d0d] border border-[#e2e0e7] hover:border-[#0d0d0d] hover:bg-[#0d0d0d]/04"
                        : "text-white border border-white/30 hover:bg-white/10 hover:border-white/50"
                    }`}>
                    {t("navbar.login") as string}
                  </Link>

                  {/* Sign-up — gold pill, always visible */}
                  <Link href="/auth/create-account"
                    className="hidden sm:inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-2.5 text-sm font-black
                               bg-[#f5c518] text-[#0d0d0d]
                               shadow-[0_4px_14px_rgba(245,197,24,0.40)]
                               hover:shadow-[0_6px_22px_rgba(245,197,24,0.52)]
                               hover:-translate-y-0.5 active:translate-y-0 transition-all group">
                    <span className="w-2 h-2 rounded-full bg-[#0d0d0d]/30 group-hover:scale-110 transition-transform shrink-0" />
                    {t("navbar.signup") as string}
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button ref={hamburgerRef} type="button" onClick={() => setIsMobileOpen(v => !v)}
                className={`md:hidden grid place-items-center w-9 h-9 rounded-full border transition-all ${
                  scrolled
                    ? "border-[#e2e0e7] text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d]"
                    : "border-white/30 text-white hover:border-white/60 hover:bg-white/10"
                }`} aria-label="Toggle menu">
                <AnimatePresence mode="wait" initial={false}>
                  {isMobileOpen ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0, scale: 0.7 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.7 }} transition={{ duration: 0.18 }}>
                      <X size={17} />
                    </motion.span>
                  ) : (
                    <motion.span key="menu" initial={{ rotate: 90, opacity: 0, scale: 0.7 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: -90, opacity: 0, scale: 0.7 }} transition={{ duration: 0.18 }}>
                      <Menu size={17} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu panel ─────────────────────────────── */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div ref={mobileRef} key="mobile-menu"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
              className="overflow-hidden md:hidden border-t border-white/10">
              <div className={`px-4 pb-5 pt-3 ${scrolled ? "bg-white/98 backdrop-blur-2xl" : "bg-[#0d0d0d]/80 backdrop-blur-xl"}`}>
                <nav className="flex flex-col gap-1 mb-4">
                  {navLinks.map((link, i) => {
                    const active = isActive(link.href);
                    return (
                      <motion.div key={link.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + i * 0.06 }}>
                        <Link href={link.href} onClick={() => setIsMobileOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                            active
                              ? "bg-[#0d0d0d] text-white"
                              : scrolled
                                ? "text-[#374151] hover:bg-[#f8f7fb] hover:text-[#0d0d0d]"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}>
                          {link.label}
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518]" />}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="flex gap-1.5 mb-4">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsMobileOpen(false); }}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                        language === lang.code
                          ? "bg-[#f5c518] text-[#0d0d0d]"
                          : scrolled
                            ? "border border-[#e2e0e7] text-[#374151] hover:border-[#0d0d0d]"
                            : "border border-white/25 text-white/70 hover:border-white/50"
                      }`}>
                      {lang.short}
                    </button>
                  ))}
                </div>

                {!user && (
                  <div className="flex gap-2">
                    <Link href="/auth/login" onClick={() => setIsMobileOpen(false)}
                      className={`flex-1 text-center rounded-full py-2.5 text-sm font-bold transition-all border ${
                        scrolled ? "border-[#e2e0e7] text-[#0d0d0d] hover:bg-[#0d0d0d]/04" : "border-white/30 text-white hover:bg-white/10"
                      }`}>
                      {t("navbar.login") as string}
                    </Link>
                    <Link href="/auth/create-account" onClick={() => setIsMobileOpen(false)}
                      className="flex-1 text-center rounded-full bg-[#f5c518] text-[#0d0d0d] py-2.5 text-sm font-black shadow-[0_4px_14px_rgba(245,197,24,0.38)] transition-all">
                      {t("navbar.signup") as string}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
