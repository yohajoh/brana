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
    /* sidebar: warm stone — distinct from the #f5f4f0 content area, not white, not black */
    <div className="flex flex-col h-full border-r border-[#ddd8cf]" style={{ background: "linear-gradient(180deg,#e8e3d9 0%,#e2ddd3 100%)" }}>

      {/* ── Top: Logo + user pill side-by-side ───────── */}
      <div className="px-4 pt-5 pb-4 border-b border-[#d4cec4]">
        <div className="flex items-center justify-between gap-3">

          {/* Logo — links home */}
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-[9px] bg-[#0d0d0d]" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-[#f5c518] rounded-tr-[9px] rounded-bl-[6px]" />
              <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-sm leading-none z-10">
                ብ
              </span>
            </div>
            <div className="leading-none min-w-0">
              <p className="text-[14px] font-serif font-black text-[#0d0d0d] tracking-tight group-hover:text-[#0d0d0d]/70 transition-colors">
                ብራና
              </p>
              <p className="text-[8px] font-bold text-[#0d0d0d]/30 tracking-[0.18em] uppercase mt-0.5">
                Library
              </p>
            </div>
          </Link>

          {/* User pill */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#d4cec4] shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-[#0d0d0d] shrink-0"
              style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)" }}
            >
              {user?.name ? initials(user.name) : loading ? "…" : "?"}
            </div>
            <div className="hidden sm:block min-w-0 max-w-[88px]">
              <p className="text-[11px] font-bold text-[#0d0d0d] truncate leading-tight">
                {user?.name?.split(" ")[0] || "User"}
              </p>
              <p className="text-[9px] text-[#0d0d0d]/35 truncate leading-tight">
                {isAdmin ? "Admin" : "Student"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section label ──────────────────────────── */}
      <p className="px-5 pt-4 pb-1.5 text-[8.5px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.22em]">
        {isAdmin ? "Administration" : "Navigation"}
      </p>

      {/* ── Nav items ──────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
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
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-colors duration-150"
            >
              {/* Active background pill */}
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-[#0d0d0d]"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}

              {/* Hover bg — only when not active */}
              {!active && (
                <span className="absolute inset-0 rounded-xl bg-[#0d0d0d]/0 group-hover:bg-[#0d0d0d]/[0.05] transition-colors duration-150" />
              )}

              <Icon
                size={15}
                strokeWidth={active ? 2.5 : 1.75}
                className={`relative z-10 shrink-0 transition-colors ${
                  active ? "text-[#f5c518]" : "text-[#0d0d0d]/35 group-hover:text-[#0d0d0d]/70"
                }`}
              />
              <span
                className={`relative z-10 text-[12.5px] truncate flex-1 transition-colors ${
                  active ? "font-bold text-white" : "font-medium text-[#0d0d0d]/55 group-hover:text-[#0d0d0d]"
                }`}
              >
                {String(item.name)}
              </span>

              {/* Gold dot on active */}
              {active && (
                <span className="relative z-10 w-1 h-1 rounded-full bg-[#f5c518] shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ─────────────────────────────────── */}
      <div className="px-2 pb-5 pt-2 border-t border-[#d4cec4]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#0d0d0d]/35 hover:text-red-500 hover:bg-red-50 transition-all duration-150 group"
        >
          <LogOut size={15} strokeWidth={1.75} className="shrink-0" />
          <span className="text-[12.5px] font-medium">{String(t("sidebar.logout"))}</span>
        </button>
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
            transition={{ duration: 0.2 }}
            type="button"
            aria-label="Close menu"
            className="sidebar-backdrop fixed inset-0 z-[2147483645] bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar — always visible */}
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
            className="lg:hidden fixed left-0 top-0 h-screen w-[268px] z-[2147483646] flex flex-col"
          >
            <SidebarInner />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
