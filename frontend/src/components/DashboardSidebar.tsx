"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, History, Heart, Settings, LogOut, Bell,
  Wallet, CalendarClock, Library, Users, BookOpen, PenTool,
  ArrowLeftRight, CalendarCheck2, TriangleAlert, ClipboardList,
  FileSpreadsheet, Layers, PanelLeftClose, PanelLeftOpen,
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
  const { isMobileSidebarOpen, closeMobileSidebar, isCollapsed, toggleCollapsed } = useDashboardShell();

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

  /* ─────────────────────────────────────────────────────────────── */
  /* Shared inner — controlled by isCollapsed on desktop            */
  /* ─────────────────────────────────────────────────────────────── */
  const renderSidebar = (collapsed: boolean) => (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(160deg,#3d4a5c 0%,#4a5568 45%,#4a5568 65%,#3d4a5c 100%)",
      }}
    >
      {/* Radial bloom */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{
        background: "radial-gradient(ellipse 75% 55% at 50% 40%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)",
      }} />
      {/* Top shine */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px z-0" style={{
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
      }} />

      <div className="relative z-10 flex flex-col h-full">

        {/* ── Header ─────────────────────────────────────────────── */}
        {collapsed ? (
          /* COLLAPSED: logo → collapse toggle → avatar, vertically centered */
          <div className="flex flex-col items-center gap-3 pt-5 pb-4 px-3">
            {/* Logo mark */}
            <Link href="/" onClick={closeMobileSidebar} aria-label="Home">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-[10px]" style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                }} />
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#f5c518] rounded-tr-[10px] rounded-bl-md" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-[13px] leading-none z-10 select-none">ብ</span>
              </div>
            </Link>

            {/* Collapse toggle — between logo and avatar */}
            <button
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="lg:flex hidden w-7 h-7 items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-all duration-150"
            >
              <PanelLeftOpen size={14} strokeWidth={2} />
            </button>

            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-[#0d0d0d]"
              style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)", boxShadow: "0 2px 8px rgba(245,197,24,0.3)" }}
              title={user?.name || "User"}
            >
              {user?.name ? initials(user.name) : loading ? "…" : "?"}
            </div>
          </div>
        ) : (
          /* EXPANDED: logo | divider | avatar+name ... collapse btn  */
          <div className="flex items-center gap-2 pt-5 pb-4 px-4">
            {/* Logo */}
            <Link href="/" onClick={closeMobileSidebar} className="flex items-center gap-2 group shrink-0">
              <div className="relative w-8 h-8 shrink-0">
                <div className="absolute inset-0 rounded-[10px]" style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                }} />
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#f5c518] rounded-tr-[10px] rounded-bl-md" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-[13px] leading-none z-10 select-none">ብ</span>
              </div>
              <div className="leading-none">
                <p className="text-[13px] font-serif font-black text-white tracking-tight group-hover:text-white/75 transition-colors">ብራና</p>
                <p className="text-[7.5px] font-bold text-white/30 tracking-[0.2em] uppercase">Library</p>
              </div>
            </Link>

            {/* Divider */}
            <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

            {/* Avatar + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black text-[#0d0d0d]"
                style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)", boxShadow: "0 2px 8px rgba(245,197,24,0.3)" }}
              >
                {user?.name ? initials(user.name) : loading ? "…" : "?"}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate leading-tight">{user?.name?.split(" ")[0] || "User"}</p>
                <p className="text-[9px] text-white/30 leading-none mt-0.5">{isAdmin ? "Admin" : "Student"}</p>
              </div>
            </div>

            {/* Collapse button — flush right, desktop only */}
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="lg:flex hidden shrink-0 w-7 h-7 items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-all duration-150 ml-auto"
            >
              <PanelLeftClose size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Section label */}
        {!collapsed && (
          <p className="px-5 pb-1.5 text-[7.5px] font-black text-white/20 uppercase tracking-[0.26em]">
            {isAdmin ? "Admin" : "Menu"}
          </p>
        )}

        {/* ── Nav items ─────────────────────────────── */}
        <nav className={`flex-1 overflow-y-auto space-y-0.5 pb-2 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                aria-current={active ? "page" : undefined}
                title={collapsed ? String(item.name) : undefined}
                className={`relative flex items-center rounded-xl group transition-colors ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={`nav-pill-${isAdmin ? "admin" : "student"}`}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.13)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backdropFilter: "blur(6px)",
                    }}
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.06] transition-colors duration-150" />
                )}
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#f5c518]" />
                )}
                <Icon
                  size={15}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={`relative z-10 shrink-0 transition-colors ${
                    active ? "text-[#f5c518]" : "text-white/35 group-hover:text-white/70"
                  }`}
                />
                {!collapsed && (
                  <span className={`relative z-10 text-[12.5px] truncate flex-1 transition-colors ${
                    active ? "font-bold text-white" : "font-medium text-white/50 group-hover:text-white/85"
                  }`}>
                    {String(item.name)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom: logout only ───────── */}
        <div className={`mt-2 pt-3 pb-5 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? String(t("sidebar.logout")) : undefined}
            className={`w-full flex items-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all duration-150 ${
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut size={15} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && (
              <span className="text-[12.5px] font-medium">{String(t("sidebar.logout"))}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /* collapsed sidebar is 64px wide, expanded is 256px (w-64) */
  const desktopW = isCollapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.button
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            type="button"
            aria-label="Close menu"
            className="sidebar-backdrop fixed inset-0 z-[2147483645] bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar — animated width */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className={`hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen z-[2147483646] overflow-hidden ${desktopW}`}
      >
        <SidebarContent collapsed={isCollapsed} />
      </motion.aside>

      {/* Mobile drawer — always full width, never collapsed */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-[270px] z-[2147483646] flex flex-col"
          >
            <SidebarContent collapsed={false} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
