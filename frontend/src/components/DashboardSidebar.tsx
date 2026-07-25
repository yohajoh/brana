"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, History, Heart, Settings, LogOut, Bell,
  Wallet, CalendarClock, Library, Users, BookOpen, PenTool,
  ArrowLeftRight, CalendarCheck2, TriangleAlert, ClipboardList,
  FileSpreadsheet, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL, invalidateCurrentUserCache } from "@/lib/api";
import { toast } from "sonner";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";

interface DashboardSidebarProps {
  variant?: "default" | "admin";
}

export const DashboardSidebar = ({ variant = "default" }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useLanguage();
  const { user, activePersona, isLoading: loading, clearSession } = usePersona();
  const { isMobileSidebarOpen, closeMobileSidebar } = useDashboardShell();

  const isAdminPath = pathname?.startsWith("/dashboard/admin");
  const isAdmin     = variant === "admin" || isAdminPath || activePersona === "ADMIN";

  const studentNav = [
    { name: t("sidebar.dashboard"),        href: "/dashboard/student",               Icon: LayoutDashboard, exact: true },
    { name: t("sidebar.history"),          href: "/dashboard/student/history",       Icon: History },
    { name: t("sidebar.wishlist"),         href: "/dashboard/student/wishlist",      Icon: Heart },
    { name: t("sidebar.reservations"),     href: "/dashboard/student/reservations",  Icon: CalendarClock },
    { name: t("sidebar.digital"),          href: "/dashboard/student/digital",       Icon: Library },
    { name: t("sidebar.payments"),         href: "/dashboard/student/payments",      Icon: Wallet },
    { name: t("sidebar.notifications"),    href: "/dashboard/student/notifications", Icon: Bell },
    { name: t("sidebar.account_settings"), href: "/dashboard/student/settings",      Icon: Settings },
  ];

  const adminNav = [
    { name: t("sidebar.dashboard"),     href: "/dashboard/admin",               Icon: LayoutDashboard, exact: true },
    { name: t("sidebar.users"),         href: "/dashboard/admin/users",         Icon: Users },
    { name: t("sidebar.books"),         href: "/dashboard/admin/books",         Icon: BookOpen },
    { name: t("sidebar.categories"),    href: "/dashboard/admin/categories",    Icon: Layers },
    { name: t("sidebar.authors"),       href: "/dashboard/admin/authors",       Icon: PenTool },
    { name: t("sidebar.borrowings"),    href: "/dashboard/admin/borrowings",    Icon: ArrowLeftRight },
    { name: t("sidebar.reservations"),  href: "/dashboard/admin/reservations",  Icon: CalendarCheck2 },
    { name: t("sidebar.overdue"),       href: "/dashboard/admin/overdue",       Icon: TriangleAlert },
    { name: t("sidebar.alerts"),        href: "/dashboard/admin/alerts",        Icon: TriangleAlert },
    { name: t("sidebar.activity_logs"), href: "/dashboard/admin/activity-logs", Icon: ClipboardList },
    { name: t("sidebar.reports"),       href: "/dashboard/admin/reports",       Icon: FileSpreadsheet },
    { name: t("sidebar.settings"),      href: "/dashboard/admin/settings",      Icon: Settings },
  ];

  const navItems = isAdmin ? adminNav : studentNav;

  const handleLogout = async () => {
    try { await fetch(`${API_BASE_URL}/auth/logout`, { method: "GET", credentials: "include" }); } catch { /* silent */ }
    invalidateCurrentUserCache();
    clearSession();
    toast.success(String(t("sidebar.logout_success")));
    router.push("/auth/login");
  };

  const initials = (name: string) =>
    name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const SidebarInner = () => (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{
        /* Dark slate-grey base matching the screenshot */
        background: "linear-gradient(160deg, #3d4a5c 0%, #4a5568 40%, #4a5568 60%, #3d4a5c 100%)",
      }}
    >
      {/* Radial bloom — the soft white light glow in the center of the screenshot */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)",
        }}
      />

      {/* Subtle top-edge highlight */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-px z-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
      />

      {/* All content sits above the glow layers */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ── Brand row ────────────────────────────── */}
        <div className="px-5 pt-6 pb-5">
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 group w-fit"
          >
            {/* Logo mark */}
            <div className="relative w-9 h-9 shrink-0">
              {/* Outer glass ring */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                }}
              />
              {/* Gold corner accent */}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#f5c518] rounded-tr-xl rounded-bl-lg" />
              <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-[15px] leading-none z-10 select-none">
                ብ
              </span>
            </div>

            {/* Text */}
            <div className="leading-none">
              <p className="text-[15px] font-serif font-black text-white tracking-tight group-hover:text-white/80 transition-colors">
                ብራና
              </p>
              <p className="text-[8.5px] font-bold text-white/35 tracking-[0.2em] uppercase mt-0.5">
                Library
              </p>
            </div>
          </Link>
        </div>

        {/* ── User card ────────────────────────────── */}
        <div className="mx-3 mb-5">
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.11)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-black text-[#0d0d0d]"
              style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)", boxShadow: "0 2px 8px rgba(245,197,24,0.4)" }}
            >
              {user?.name ? initials(user.name) : loading ? "…" : "?"}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-white truncate leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[9.5px] text-white/35 truncate leading-tight mt-0.5">
                {user?.email || (isAdmin ? "Administrator" : "Student")}
              </p>
            </div>
          </div>
        </div>

        {/* ── Section label ────────────────────────── */}
        <p className="px-5 pb-1.5 text-[8px] font-black text-white/25 uppercase tracking-[0.24em]">
          {isAdmin ? "Admin" : "Menu"}
        </p>

        {/* ── Nav ──────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                aria-current={active ? "page" : undefined}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl group"
              >
                {/* Animated active pill */}
                {active && (
                  <motion.span
                    layoutId={`nav-pill-${isAdmin ? "admin" : "student"}`}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(6px)",
                    }}
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                )}

                {/* Hover layer */}
                {!active && (
                  <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.06] transition-colors duration-150" />
                )}

                {/* Left gold bar on active */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#f5c518]" />
                )}

                <Icon
                  size={15}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={`relative z-10 shrink-0 transition-colors ${
                    active
                      ? "text-[#f5c518]"
                      : "text-white/35 group-hover:text-white/70"
                  }`}
                />
                <span
                  className={`relative z-10 text-[12.5px] truncate flex-1 transition-colors ${
                    active
                      ? "font-bold text-white"
                      : "font-medium text-white/50 group-hover:text-white/85"
                  }`}
                >
                  {String(item.name)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Logout ───────────────────────────────── */}
        <div
          className="mx-3 mb-5 mt-3 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all duration-150 group"
          >
            <LogOut size={15} strokeWidth={1.75} className="shrink-0" />
            <span className="text-[12.5px] font-medium">{String(t("sidebar.logout"))}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.button
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            type="button"
            aria-label="Close menu"
            className="sidebar-backdrop fixed inset-0 z-[2147483645] bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Desktop — always visible */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen w-64 z-[2147483646]">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-[270px] z-[2147483646] flex flex-col"
          >
            <SidebarInner />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
