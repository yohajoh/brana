"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Heart,
  Settings,
  LogOut,
  Bell,
  Wallet,
  CalendarClock,
  Library,
  Users,
  BookOpen,
  PenTool,
  ArrowLeftRight,
  CalendarCheck2,
  TriangleAlert,
  ClipboardList,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { API_BASE_URL, invalidateCurrentUserCache } from "@/lib/api";
import { toast } from "sonner";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface DashboardSidebarProps {
  variant?: "default" | "admin";
}

export const DashboardSidebar = ({ variant = "default" }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, activePersona, isLoading: loading, clearSession } = usePersona();

  const isAdminVariant = variant === "admin";

  const isStudent = activePersona === "STUDENT";
  const isAdmin = activePersona === "ADMIN" || isAdminVariant;
  const baseRoute = isStudent ? "/dashboard/student" : "/dashboard/admin";

  const studentNavItems = [
    {
      name: t("sidebar.dashboard"),
      href: baseRoute,
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: t("sidebar.history"),
      href: `${baseRoute}/history`,
      icon: <History size={20} />,
    },
    {
      name: t("sidebar.wishlist"),
      href: `${baseRoute}/wishlist`,
      icon: <Heart size={20} />,
    },
    {
      name: t("sidebar.reservations"),
      href: `${baseRoute}/reservations`,
      icon: <CalendarClock size={20} />,
    },
    {
      name: t("sidebar.digital"),
      href: `${baseRoute}/digital`,
      icon: <Library size={20} />,
    },
    {
      name: t("sidebar.payments"),
      href: `${baseRoute}/payments`,
      icon: <Wallet size={20} />,
    },
    {
      name: t("sidebar.notifications"),
      href: `${baseRoute}/notifications`,
      icon: <Bell size={20} />,
    },
    {
      name: t("sidebar.account_settings"),
      href: `${baseRoute}/settings`,
      icon: <Settings size={20} />,
    },
  ];

  const adminNavItems = [
    {
      name: t("sidebar.dashboard"),
      href: "/dashboard/admin",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: t("sidebar.users"),
      href: "/dashboard/admin/users",
      icon: <Users size={20} />,
    },
    {
      name: t("sidebar.books"),
      href: "/dashboard/admin/books",
      icon: <BookOpen size={20} />,
    },
    {
      name: t("sidebar.categories"),
      href: "/dashboard/admin/categories",
      icon: <Layers size={20} />,
    },
    {
      name: t("sidebar.authors"),
      href: "/dashboard/admin/authors",
      icon: <PenTool size={20} />,
    },
    {
      name: t("sidebar.borrowings"),
      href: "/dashboard/admin/borrowings",
      icon: <ArrowLeftRight size={20} />,
    },
    {
      name: t("sidebar.reservations"),
      href: "/dashboard/admin/reservations",
      icon: <CalendarCheck2 size={20} />,
    },
    {
      name: t("sidebar.overdue"),
      href: "/dashboard/admin/overdue",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: t("sidebar.alerts"),
      href: "/dashboard/admin/alerts",
      icon: <TriangleAlert size={20} />,
    },
    {
      name: t("sidebar.activity_logs"),
      href: "/dashboard/admin/activity-logs",
      icon: <ClipboardList size={20} />,
    },
    {
      name: t("sidebar.reports"),
      href: "/dashboard/admin/reports",
      icon: <FileSpreadsheet size={20} />,
    },
    {
      name: t("sidebar.settings"),
      href: "/dashboard/admin/settings",
      icon: <Settings size={20} />,
    },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const activeClass = isAdminVariant
    ? "bg-[#C2B199] text-[#2B1A10] font-bold shadow-sm"
    : "bg-primary text-background font-bold shadow-lg";

  const inactiveClass = isAdminVariant
    ? "text-[#2B1A10]/60 hover:bg-[#F3EFE6] hover:text-[#2B1A10]"
    : "text-secondary hover:bg-muted/50 hover:text-primary";

  const iconActiveClass = isAdminVariant ? "text-[#2B1A10]" : "text-background";
  const iconInactiveClass = isAdminVariant
    ? "text-[#2B1A10]/50 group-hover:text-[#2B1A10]"
    : "text-secondary/60 group-hover:text-primary";

  const bgClass = isAdminVariant ? "bg-[#FDF8F0] border-[#E1D2BD]/50" : "bg-muted/30 border-border/50";
  const textClass = isAdminVariant ? "text-[#3B2718]" : "text-primary";
  const secondaryTextClass = isAdminVariant ? "text-[#AE9E85]" : "text-secondary/60";

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      invalidateCurrentUserCache();
      clearSession();
      toast.success(t("sidebar.logout_success") || "Logged out successfully");
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      invalidateCurrentUserCache();
      clearSession();
      toast.error(t("sidebar.logout_failed") || "Logout failed. Redirecting to login.");
      router.push("/auth/login");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-full lg:w-72 flex flex-col ${bgClass} border-r ${isAdminVariant ? "border-[#E1D2BD]/50" : "border-border/50"} px-6 py-10 z-40`}
    >
      <nav className="grow space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <span className={isActive ? iconActiveClass : iconInactiveClass}>{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto pt-8 border-t ${isAdminVariant ? "border-[#E1D2BD]/50" : "border-border/50"} space-y-6`}>
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isAdminVariant ? "bg-[#E1D2BD] text-[#3B2718]" : "bg-secondary/20 text-primary"}`}
          >
            {user?.name ? getInitials(user.name) : loading ? ".." : "?"}
          </div>
          <div className="space-y-0.5">
            <p className={`text-sm font-bold truncate ${textClass}`}>{user?.name || "User"}</p>
            <p className={`text-[11px] truncate ${secondaryTextClass}`}>{user?.email || ""}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all group ${isAdminVariant ? "text-[#2B1A10]/60 hover:text-red-500 hover:bg-red-50" : "text-secondary hover:text-red-500 hover:bg-red-50"}`}
        >
          <LogOut size={20} className="group-hover:text-red-500" />
          <span className="text-sm font-medium">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
};
