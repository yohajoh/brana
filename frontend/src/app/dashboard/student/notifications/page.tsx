"use client";
"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useNotifications, useMarkAsRead, useMarkAllAsRead,
  type Notification,
} from "@/lib/hooks/useNotifications";
import { useLanguage }          from "@/components/providers/LanguageProvider";
import { NotificationOverlay }  from "@/components/notifications/NotificationOverlay";

const fadeUp  = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16,1,0.3,1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

const typeConfig = (type: string) => {
  switch (type) {
    case "ALERT":
    case "OVERDUE":  return { dot: "bg-red-500",     badge: "bg-red-50 text-red-600 border-red-100" };
    case "REMINDER": return { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-100" };
    case "NEW_BOOK": return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    default:         return { dot: "bg-[#0d0d0d]/20", badge: "bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]" };
  }
};

function NotifItem({ n, onClick }: { n: Notification; onClick: () => void }) {
  const cfg = typeConfig(n.type);
  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-150 p-4 flex items-start gap-4 group
        ${!n.is_read
          ? "bg-white border-[#f5c518]/50 shadow-[0_0_0_3px_rgba(245,197,24,0.08)]"
          : "bg-white border-[#e8e4dc] hover:border-[#d8d4cc]"
        }`}
    >
      <div className="mt-1.5 shrink-0">
        <span className={`block w-2 h-2 rounded-full ${!n.is_read ? cfg.dot : "bg-[#e8e4dc]"}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${cfg.badge}`}>
            {n.type}
          </span>
          {!n.is_read && (
            <span className="text-[9px] font-black text-[#f5c518] uppercase tracking-wide">New</span>
          )}
        </div>
        <p className="text-[13px] font-medium text-[#0d0d0d] leading-snug line-clamp-2 group-hover:line-clamp-none transition-all">
          {n.message}
        </p>
        <p className="text-[11px] text-[#0d0d0d]/30">
          {new Date(n.created_at).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
    </motion.button>
  );
}

function NotificationsContent() {
  const { t }      = useLanguage();
  const router     = useRouter();
  const params     = useSearchParams();
  const notifId    = params.get("notification");

  const { data, isLoading, refetch } = useNotifications({ limit: 50 });
  const markOne = useMarkAsRead();
  const markAll = useMarkAllAsRead();

  const active = useMemo(
    () => (notifId && data?.notifications ? data.notifications.find(n => n.id === notifId) ?? null : null),
    [notifId, data],
  );

  const handleMarkAll = async () => {
    try {
      await markAll.mutateAsync();
      toast.success(String(t("student_notifications.success_mark_all")));
    } catch {
      toast.error(String(t("student_notifications.failed_mark_all")));
    }
  };

  const handleClick = (n: Notification) => {
    router.replace(`/dashboard/student/notifications?notification=${n.id}`, { scroll: false });
    if (!n.is_read) markOne.mutate(n.id);
  };

  const handleClose = () =>
    router.replace("/dashboard/student/notifications", { scroll: false });

  const unread = data?.unreadCount ?? 0;
  const list   = data?.notifications ?? [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Inbox</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
            {String(t("student_notifications.title"))}
          </h1>
          {unread > 0 && (
            <p className="text-sm text-[#0d0d0d]/40 mt-1">
              {unread} {String(t("student_notifications.unread_count") || "unread")}
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markAll.isPending}
            className="mt-2 px-4 py-2 rounded-full bg-[#0d0d0d] text-white text-[11px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors shrink-0"
          >
            {markAll.isPending
              ? String(t("student_notifications.marking"))
              : String(t("student_notifications.mark_all"))}
          </button>
        )}
      </motion.div>

      {/* List */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[#e8e4dc] p-4 h-20 animate-pulse" />
            ))}
          </motion.div>
        ) : list.length > 0 ? (
          <motion.div key="list" variants={stagger} initial="hidden" animate="show"
            className="space-y-2 pb-10">
            {list.map(n => (
              <NotifItem key={n.id} n={n} onClick={() => handleClick(n)} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" variants={fadeUp}
            className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-14 text-center pb-10">
            <p className="text-sm text-[#0d0d0d]/35">
              {String(t("student_notifications.no_notifications"))}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationOverlay
        notification={active}
        isOpen={!!active}
        onClose={handleClose}
        refetch={refetch}
      />
    </motion.div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-6 sm:px-6 space-y-2 max-w-[780px]">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-[#e8e4dc] animate-pulse" />)}
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  );
}
