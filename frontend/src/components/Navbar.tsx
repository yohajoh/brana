"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AdminNotificationDropdown } from "@/components/notifications/AdminNotificationDropdown";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Globe, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";
import { motion, AnimatePresence } from "framer-motion";

type LanguageCode = "en" | "am" | "or";

export const Navbar = () => {
  const pathname = usePathname();
  const { user } = usePersona();
  const { language, setLanguage, t } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { toggleMobileSidebar } = useDashboardShell();

  const isStudentDashboard = pathname.startsWith("/dashboard/student");
  const isAdminDashboard = pathname.startsWith("/dashboard/admin");
  const isDashboard = pathname.startsWith("/dashboard/");

  // Track scroll for public nav blur/shadow enhancement
  useEffect(() => {
    if (isDashboard) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDashboard]);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const languages: Array<{ code: LanguageCode; name: string; flag: string }> = [
    { code: "en", name: "English",  flag: "🇬🇧" },
    { code: "am", name: "አማርኛ",    flag: "🇪🇹" },
    { code: "or", name: "Oromiffa", flag: "🇪🇹" },
  ];

  const navLinks = [
    { href: "/",      label: t("navbar.home") as string   },
    { href: "/books", label: t("navbar.books") as string  },
    { href: "/about", label: t("navbar.about") as string  },
  ];

  /* ── Dashboard header ─────────────────────────────────────── */
  if (isDashboard) {
    return (
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-[70] border-b border-[#e2e0e7]/60 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#142b6f] hover:text-[#142b6f] transition-all"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-[#374151]">
              {isAdminDashboard ? "Admin Dashboard" : "Student Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Language */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-[#e2e0e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[#142b6f] hover:text-[#142b6f] transition-all"
              >
                <Globe size={13} />
                <span className="uppercase">{language}</span>
              </button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-36 dropdown-panel p-1.5 z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          language === lang.code
                            ? "bg-[#142b6f]/08 text-[#142b6f]"
                            : "text-[#374151] hover:bg-[#f8f7fb]"
                        }`}
                      >
                        <span>{lang.flag}</span>
                        {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isStudentDashboard && <NotificationDropdown />}
            {isAdminDashboard && <AdminNotificationDropdown />}
            {user && <PersonaSwitcher />}
          </div>
        </div>
      </header>
    );
  }

  /* ── Public header ────────────────────────────────────────── */
  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? "border-b border-[#e2e0e7]/80 bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(20,43,111,0.07)]"
        : "border-b border-transparent bg-white/60 backdrop-blur-md"
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#142b6f] flex items-center justify-center shadow-[0_2px_8px_rgba(20,43,111,0.28)] group-hover:shadow-[0_4px_14px_rgba(20,43,111,0.38)] transition-shadow">
              <span className="text-white font-serif font-black text-sm leading-none select-none">ብ</span>
            </div>
            <span className="text-xl font-serif font-black tracking-tight text-[#142b6f]">
              ብራና
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive(link.href) && !(link.href !== "/" && !pathname.startsWith(link.href))
                    ? "text-[#142b6f] bg-[#142b6f]/07"
                    : "text-[#374151] hover:text-[#142b6f] hover:bg-[#142b6f]/05"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-[#142b6f] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#e2e0e7] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#374151] hover:border-[#142b6f] hover:text-[#142b6f] transition-all"
              >
                <Globe size={13} />
                <span className="uppercase">{language}</span>
              </button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-36 dropdown-panel p-1.5 z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          language === lang.code
                            ? "bg-[#142b6f]/08 text-[#142b6f]"
                            : "text-[#374151] hover:bg-[#f8f7fb]"
                        }`}
                      >
                        <span>{lang.flag}</span>
                        {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <PersonaSwitcher />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold text-[#142b6f] border border-[#e2e0e7] hover:border-[#142b6f] hover:bg-[#142b6f]/05 transition-all"
                >
                  {t("navbar.login") as string}
                </Link>
                <Link
                  href="/auth/create-account"
                  className="hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold text-white bg-[#142b6f] shadow-[0_4px_14px_rgba(20,43,111,0.3)] hover:shadow-[0_6px_20px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  {t("navbar.signup") as string}
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsPublicMenuOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-[#e2e0e7] text-[#374151] hover:border-[#142b6f] hover:text-[#142b6f] transition-all"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isPublicMenuOpen ? (
                  <motion.span key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={18} />
                  </motion.span>
                ) : (
                  <motion.span key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {isPublicMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden pb-4"
            >
              <div className="rounded-2xl border border-[#e2e0e7] bg-white/95 backdrop-blur-xl p-3 shadow-[0_8px_32px_rgba(20,43,111,0.10)] mt-1">
                <nav className="flex flex-col gap-1 mb-3">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsPublicMenuOpen(false)}
                      className={`flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isActive(link.href)
                          ? "bg-[#142b6f]/08 text-[#142b6f]"
                          : "text-[#374151] hover:bg-[#f8f7fb] hover:text-[#142b6f]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Language (mobile) */}
                <div className="flex flex-wrap gap-1.5 mb-3 px-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setIsPublicMenuOpen(false); }}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors border ${
                        language === lang.code
                          ? "border-[#142b6f] bg-[#142b6f]/08 text-[#142b6f]"
                          : "border-[#e2e0e7] text-[#374151] hover:border-[#142b6f]"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>

                {!user && (
                  <div className="flex gap-2 pt-1">
                    <Link
                      href="/auth/login"
                      onClick={() => setIsPublicMenuOpen(false)}
                      className="flex-1 text-center rounded-full border border-[#e2e0e7] py-2.5 text-sm font-bold text-[#142b6f] hover:border-[#142b6f] transition-all"
                    >
                      {t("navbar.login") as string}
                    </Link>
                    <Link
                      href="/auth/create-account"
                      onClick={() => setIsPublicMenuOpen(false)}
                      className="flex-1 text-center rounded-full py-2.5 text-sm font-bold text-white bg-[#142b6f] shadow-md transition-all"
                    >
                      {t("navbar.signup") as string}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
