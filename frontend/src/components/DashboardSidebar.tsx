"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, History, Heart, Settings, LogOut, Bell,
  Wallet, CalendarClock, Library, Users, BookOpen, PenTool,
  ArrowLeftRight, CalendarCheck2, TriangleAlert, ClipboardList,
  FileSpreadsheet, Layers,
} from "lucide-react";
import { API_BASE_URL, invalidateCurrentUserCache } from "@/lib/api";
import { toast } from "sonner";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";

interface DashboardSidebarProps {
  variant?: "default" | "admin";
}

export const DashboardSidebar = ({ variant = "default" }: DashboardSidebarProps) => {
  const pathname  = usePathname();
  const router    = useRouter();
  const { t }     = useLanguage();
  const { user, activePersona, isLoading: loading, clearSession } = usePersona();
  const { isMobileSidebarOpen, closeMobileSidebar } = useDashboardShell();

  const isAdminPath  = pathname?.startsWith("/dashboard/admin");
  const isAdmin      = variant === "admin" || isAdminPath || activePersona === "ADMIN";

  const studentNav = [
    { name: t("sidebar.dashboard"),         href: "/dashboard/student",               icon: LayoutDashboard, exact: true },
    { name: t("sidebar.history"),           href: "/dashboard/student/history",       icon: History },
    { name: t("sidebar.wishlist"),          href: "/dashboard/student/wishlist",      icon: Heart },
    { name: t("sidebar.reservations"),      href: "/dashboard/student/reservations",  icon: CalendarClock },
    { name: t("sidebar.digital"),           href: "/dashboard/student/digital",       icon: Library },
    { name: t("sidebar.payments"),          href: "/dashboard/student/payments",      icon: Wallet },
    { name: t("sidebar.notifications"),     href: "/dashboard/student/notifications", icon: Bell },
    { name: t("sidebar.account_settings"),  href: "/dashboard/student/settings",      icon: Settings },
  ];

  const adminNav = [
    { name: t("sidebar.dashboard"),      href: "/dashboard/admin",                icon: LayoutDashboard, exact: true },
    { name: t("sidebar.users"),          href: "/dashboard/admin/users",          icon: Users },
    { name: t("sidebar.books"),          href: "/dashboard/admin/books",          icon: BookOpen },
    { name: t("sidebar.categories"),     href: "/dashboard/admin/categories",     icon: Layers },
    { name: t("sidebar.authors"),        href: "/dashboard/admin/authors",        icon: PenTool },
    { name: t("sidebar.borrowings"),     href: "/dashboard/admin/borrowings",     icon: ArrowLeftRight },
    { name: t("sidebar.reservations"),   href: "/dashboard/admin/reservations",   icon: CalendarCheck2 },
    { name: t("sidebar.overdue"),        href: "/dashboard/admin/overdue",        icon: TriangleAlert },
    { name: t("sidebar.alerts"),         href: "/dashboard/admin/alerts",         icon: TriangleAlert },
    { name: t("sidebar.activity_logs"),  href: "/dashboard/admin/activity-logs",  icon: ClipboardList },
    { name: t("sidebar.reports"),        href: "/dashboard/admin/reports",        icon: FileSpreadsheet },
    { name: t("sidebar.settings"),       href: "/dashboard/admin/settings",       icon: Settings },
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
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="sidebar-backdrop fixed inset-0 z-[2147483645] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-screen w-72 flex flex-col z-[2147483646]
        transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:translate-x-0
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        style={{ background: "linear-gradient(160deg, #1c1917 0%, #292524 100%)" }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />

        <div className="relative flex flex-col h-full px-4 py-6">

          {/* ── Brand ───────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-2 mb-7">
            <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 rounded-[10px]" style={{ background: "rgba(245,197,24,0.15)", border: "1px solid rgba(245,197,24,0.25)" }} />
              <span className="relative text-[#f5c518] font-serif font-black text-lg leading-none z-10">ብ</span>
            </div>
            <div>
              <p className="text-[15px] font-serif font-black text-white leading-tight">ብራና</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 leading-tight">Library</p>
            </div>
          </div>

          {/* ── User card ────────────────────────────────────── */}
          <div className="mx-1 mb-5 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-black text-[#1c1917]"
              style={{ background: "linear-gradient(135deg, #f5c518, #e8a800)" }}>
              {user?.name ? initials(user.name) : loading ? "…" : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white truncate leading-tight">{user?.name || "User"}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email || ""}</p>
            </div>
          </div>

          {/* ── Section label ────────────────────────────────── */}
          <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/20">
            {isAdmin ? "Admin" : "Menu"}
          </p>

          {/* ── Nav ─────────────────────────────────────────── */}
          <nav className="flex-1 overflow-y-auto space-y-0.5">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileSidebar}
                  aria-current={active ? "page" : undefined}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-150 relative
                    ${active
                      ? "text-[#1c1917]"
                      : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                    }
                  `}
                  style={active
                    ? { background: "linear-gradient(135deg, #f5c518, #e8b000)", boxShadow: "0 4px 14px rgba(245,197,24,0.28)" }
                    : {}
                  }
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2.5 : 1.75}
                    className={`shrink-0 ${active ? "text-[#1c1917]" : "text-white/35 group-hover:text-white/65"}`}
                  />
                  <span className={`text-[13px] truncate flex-1 ${active ? "font-bold" : "font-medium"}`}>
                    {String(item.name)}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ── Logout ──────────────────────────────────────── */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/60 transition-all duration-150 hover:bg-white/[0.04]"
            >
              <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="text-[13px] font-medium">{String(t("sidebar.logout"))}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
