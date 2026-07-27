"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, AlertCircle, BookOpen, Clock, Info, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAllNotifications, useMarkAsRead, type Notification } from "@/lib/hooks/useNotifications";
import { useLanguage } from "@/components/providers/LanguageProvider";

/* ── type config ─────────────────────────────────────────── */
const typeConfig = (type: string) => {
  switch (type) {
    case "ALERT":
    case "OVERDUE":
      return { icon: AlertCircle, dot: "bg-red-500", bg: "bg-red-50", text: "text-red-600", border: "border-red-100" };
    case "REMINDER":
      return { icon: Clock, dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" };
    case "NEW_BOOK":
      return { icon: BookOpen, dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" };
    default:
      return { icon: Info, dot: "bg-[#142b6f]", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" };
  }
};

/* ── relative time ───────────────────────────────────────── */
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

/* ── main component ──────────────────────────────────────── */
export function AdminNotificationDropdown() {
  const { t } = useLanguage();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Refetch every 30 s so unread count stays live */
  const { data, isLoading, refetch } = useAllNotifications(
    { limit: 15 },
    // refetchInterval only works via useQuery options — pass through staleTime instead
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const listToShow = notifications.filter((n) => !n.is_read).length > 0
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const markAsReadMutation = useMarkAsRead();

  /* Position the panel using the button's bounding rect */
  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelWidth = Math.min(390, window.innerWidth - 16);
    // right-align to button, but clamp so it never goes off left edge
    const rightFromViewport = window.innerWidth - rect.right;
    const clampedRight = Math.max(8, Math.min(rightFromViewport, window.innerWidth - panelWidth - 8));
    setPanelPos({
      top: rect.bottom + window.scrollY + 6,
      right: clampedRight,
    });
  }, []);

  /* Open / close */
  const toggle = () => {
    if (!isOpen) {
      reposition();
      refetch();
    }
    setIsOpen((v) => !v);
  };

  /* Close on outside click */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  /* Reposition on resize / scroll while open */
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, reposition]);

  /* Periodic refetch for live count */
  useEffect(() => {
    const id = setInterval(() => refetch(), 30000);
    return () => clearInterval(id);
  }, [refetch]);

  const handleClick = (n: Notification) => {
    setIsOpen(false);
    router.push(`/dashboard/admin/alerts?tab=notifications&notification=${n.id}`);
    if (!n.is_read) markAsReadMutation.mutate(n.id, { onSuccess: () => refetch() });
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/dashboard/admin/alerts?tab=notifications");
  };

  /* ── panel width: never exceed viewport - 16px ── */
  const panelWidth = typeof window !== "undefined"
    ? Math.min(390, window.innerWidth - 16)
    : 390;

  return (
    <>
      {/* ── Bell button ────────────────────────────────── */}
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#142b6f] hover:text-[#142b6f] transition-all duration-150"
      >
        <Bell size={16} strokeWidth={1.75} />

        {/* Red badge — always rendered if count > 0 */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="notif-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-[3px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none shadow-sm"
              style={{ border: "2px solid white" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Dropdown panel — rendered via portal so it's never clipped ── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              key="notif-panel"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: panelPos.top,
                right: panelPos.right,
                width: panelWidth,
                maxHeight: "min(520px, calc(100dvh - 80px))",
                zIndex: 2147483647,
              }}
              className="bg-white rounded-2xl border border-[#e2e0e7] shadow-[0_20px_60px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden"
            >

              {/* ── Header ───────────────────────────────── */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e8e4dc] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#142b6f] flex items-center justify-center shrink-0">
                    <Bell size={13} className="text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-[#0d0d0d] leading-none">
                      {String(t("student_notifications.title"))}
                    </p>
                    {unreadCount > 0 && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleViewAll}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#142b6f] hover:text-[#0d0d0d] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#f5f4f0]"
                >
                  View all
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* ── List ─────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-[#f0eeea] shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 bg-[#f0eeea] rounded-full w-4/5" />
                          <div className="h-2.5 bg-[#f0eeea] rounded-full w-2/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : listToShow.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#f5f4f0] flex items-center justify-center mb-3">
                      <CheckCheck size={22} className="text-[#0d0d0d]/15" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#0d0d0d]/40">All caught up</p>
                    <p className="text-[11px] text-[#0d0d0d]/25 mt-1">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0eeea]">
                    {listToShow.map((n, i) => {
                      const cfg = typeConfig(n.type);
                      const Icon = cfg.icon;
                      return (
                        <motion.button
                          key={n.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.035, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => handleClick(n)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors group ${
                            !n.is_read ? "bg-blue-50/30 hover:bg-blue-50/60" : "hover:bg-[#faf9f6]"
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                            <Icon size={15} className={cfg.text} strokeWidth={2} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12.5px] leading-snug line-clamp-2 group-hover:line-clamp-none transition-all ${
                              !n.is_read ? "font-semibold text-[#0d0d0d]" : "font-medium text-[#0d0d0d]/65"
                            }`}>
                              {n.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {n.type}
                              </span>
                              <span className="text-[10px] text-[#0d0d0d]/30">{timeAgo(n.created_at)}</span>
                            </div>
                          </div>

                          {/* Unread dot */}
                          {!n.is_read && (
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${cfg.dot}`} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Footer ───────────────────────────────── */}
              {listToShow.length > 0 && (
                <div className="border-t border-[#e8e4dc] px-4 py-3 shrink-0">
                  <button
                    onClick={handleViewAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#142b6f] hover:bg-[#1e3a8a] text-white text-[12px] font-bold transition-colors"
                  >
                    View all notifications
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
