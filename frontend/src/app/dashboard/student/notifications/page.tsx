"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, Notification } from "@/lib/hooks/useNotifications";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { LoadingList } from "@/components/ui/Loading";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";

const typeStyle = (type: string) => {
  switch (type) {
    case "ALERT":
    case "OVERDUE":  return { dot: "bg-red-500",    badge: "bg-red-100 text-red-700" };
    case "REMINDER": return { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700" };
    case "NEW_BOOK": return { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" };
    default:         return { dot: "bg-[#0d0d0d]/30", badge: "bg-[#f0eeea] text-[#0d0d0d]/60" };
  }
};

function NotificationItem({ n, onClick }: { n: Notification; onClick: () => void }) {
  const style = typeStyle(n.type);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border transition-all duration-150 hover:shadow-sm p-4 flex items-start gap-4
        ${!n.is_read ? "border-[#f5c518]/60 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]" : "border-[#e8e6e1] hover:border-[#d8d6d1]"}`}
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        <div className={`w-2 h-2 rounded-full ${!n.is_read ? style.dot : "bg-[#e8e6e1]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-md ${style.badge}`}>
            {n.type}
          </span>
          {!n.is_read && (
            <span className="text-[9px] font-black text-[#f5c518] uppercase tracking-wide">New</span>
          )}
        </div>
        <p className="text-[13px] font-medium text-[#0d0d0d] leading-snug line-clamp-2">{n.message}</p>
        <p className="text-[11px] text-[#0d0d0d]/35 mt-2">
          {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </button>
  );
}

function NotificationsContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationId = searchParams.get("notification");

  const { data, isLoading, refetch } = useNotifications({ limit: 50 });
  const markAsRead    = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const activeNotification = useMemo(() => {
    if (!notificationId || !data?.notifications) return null;
    return data.notifications.find(n => n.id === notificationId) || null;
  }, [notificationId, data]);

  const handleMarkAll = async () => {
    try {
      await markAllAsRead.mutateAsync();
      toast.success(String(t("student_notifications.success_mark_all")));
    } catch {
      toast.error(String(t("student_notifications.failed_mark_all")));
    }
  };

  const handleClick = (n: Notification) => {
    router.replace(`/dashboard/student/notifications?notification=${n.id}`, { scroll: false });
    if (!n.is_read) markAsRead.mutate(n.id);
  };

  const handleClose = () => {
    router.replace("/dashboard/student/notifications", { scroll: false });
  };

  const unread = data?.unreadCount ?? 0;
  const list   = data?.notifications ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-7 sm:px-6 space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Inbox</p>
          <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">
            {String(t("student_notifications.title"))}
          </h1>
          {unread > 0 && (
            <p className="text-sm text-[#0d0d0d]/45 mt-1">
              {unread} unread
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markAllAsRead.isPending}
            className="px-4 py-2 rounded-full bg-[#0d0d0d] text-white text-[11px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors shrink-0 mt-2"
          >
            {markAllAsRead.isPending
              ? String(t("student_notifications.marking"))
              : String(t("student_notifications.mark_all"))}
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 pb-10">
        {isLoading ? (
          <LoadingList count={5} />
        ) : list.length > 0 ? (
          list.map(n => <NotificationItem key={n.id} n={n} onClick={() => handleClick(n)} />)
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-12 text-center">
            <p className="text-sm text-[#0d0d0d]/35">
              {String(t("student_notifications.no_notifications"))}
            </p>
          </div>
        )}
      </div>

      <NotificationOverlay
        notification={activeNotification}
        isOpen={!!activeNotification}
        onClose={handleClose}
        refetch={refetch}
      />
    </div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={<div className="p-12"><LoadingList count={5} /></div>}>
      <NotificationsContent />
    </Suspense>
  );
}
