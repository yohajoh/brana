"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Check, AlertCircle, BookOpen, Clock, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAllNotifications, useMarkAsRead, type Notification } from "@/lib/hooks/useNotifications";
import { useLanguage } from "@/components/providers/LanguageProvider";

const typeConfig = (type: string) => {
  switch (type) {
    case "ALERT":
    case "OVERDUE":
      return {
        icon: AlertCircle,
        dot: "bg-red-500",
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-100",
      };
    case "REMINDER":
      return {
        icon: Clock,
        dot: "bg-amber-400",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-100",
      };
    case "NEW_BOOK":
      return {
        icon: BookOpen,
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-100",
      };
    default:
      return {
        icon: Info,
        dot: "bg-[#142b6f]",
        bg: "bg-[#f0f3ff]",
        text: "text-[#142b6f]",
        border: "border-[#e0e6ff]",
      };
  }
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AdminNotificationDropdown() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data, isLoading, refetch } = useAllNotifications({ limit: 10 });
  const markAsReadMutation = useMarkAsRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const unreadList = notifications.filter((n) => !n.is_read);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (n: Notification) => {
    setIsOpen(false);
    router.push(`/dashboard/admin/alerts?tab=notifications&notification=${n.id}`);
    if (!n.is_read) {
      markAsReadMutation.mutate(n.id, { onSuccess: () => refetch() });
    }
  };

  const handleViewAll = () => {
    router.push("/dashboard/admin/alerts?tab=notifications");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell button ─────────────────────────────────── */}
      <button
        onClick={() => { setIsOpen((v) => !v); if (!isOpen) refetch(); }}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-all duration-150"
      >
        <Bell size={16} strokeWidth={1.75} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black shadow-sm border-2 border-white leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Dropdown panel ──────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-[min(380px,calc(100vw-24px))] bg-white rounded-2xl border border-[#e2e0e7] shadow-[0_16px_48px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden z-[2147483647]"
            style={{ maxHeight: "min(520px, 85dvh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e8e4dc]">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-black text-[#0d0d0d]">
                  {String(t("student_notifications.title"))}
                </p>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={handleViewAll}
                className="text-[11px] font-bold text-[#142b6f] hover:text-[#0d0d0d] transition-colors"
              >
                {String(t("student_notifications.view_all"))}
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: "min(400px, 65dvh)" }}>
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-xl bg-[#f0eeea] shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-[#f0eeea] rounded-full w-3/4" />
                        <div className="h-2.5 bg-[#f0eeea] rounded-full w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : unreadList.length === 0 && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5f4f0] flex items-center justify-center mb-3">
                    <Bell size={20} className="text-[#0d0d0d]/20" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#0d0d0d]/50 text-center">
                    {String(t("student_notifications.no_unread"))}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#e8e4dc]/50">
                  {(unreadList.length > 0 ? unreadList : notifications).map((n, i) => {
                    const cfg = typeConfig(n.type);
                    const Icon = cfg.icon;
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors ${
                          !n.is_read
                            ? "bg-[#f5f4f0]/70 hover:bg-[#f0eeea]"
                            : "hover:bg-[#faf9f6]"
                        }`}
                      >
                        {/* Icon bubble */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                          <Icon size={14} className={cfg.text} strokeWidth={2} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12.5px] leading-snug line-clamp-2 ${!n.is_read ? "font-semibold text-[#0d0d0d]" : "font-medium text-[#0d0d0d]/70"}`}>
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              {n.type}
                            </span>
                            <span className="text-[10px] text-[#0d0d0d]/30">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>

                        {/* Unread dot */}
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#142b6f] shrink-0 mt-1.5" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {(unreadList.length > 0 || notifications.length > 0) && (
              <div className="border-t border-[#e8e4dc] px-4 py-3">
                <button
                  onClick={handleViewAll}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#f5f4f0] hover:bg-[#ece9e3] text-[12px] font-bold text-[#0d0d0d] transition-colors"
                >
                  {String(t("student_notifications.view_all"))}
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
