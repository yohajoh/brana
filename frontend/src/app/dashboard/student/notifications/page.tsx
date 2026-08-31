"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, CheckCheck } from "lucide-react";
import {
  useNotifications, useMarkAsRead, useMarkAllAsRead,
  type Notification,
} from "@/lib/hooks/useNotifications";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";

const fadeUp  = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16,1,0.3,1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };

const typeConfig = (type: string) => {
  switch (type) {
    case "ALERT":
    case "OVERDUE":  return { dot: "bg-red-500",     badge: "bg-red-50 text-red-600 border-red-100" };
    case "REMINDER": return { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-100" };
    case "NEW_BOOK": return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    default:         return { dot: "bg-[#142b6f]/30", badge: "bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]" };
  }
};

/* ── Single notification row ─────────────────────────────── */
function NotifItem({
  n, selected, onSelect, onOpen, onDelete, deleting,
}: {
  n: Notification; selected: boolean;
  onSelect: () => void; onOpen: () => void;
  onDelete: () => void; deleting: boolean;
}) {
  const cfg = typeConfig(n.type);
  return (
    <motion.div
      variants={fadeUp}
      layout
      className={`relative rounded-2xl border transition-all duration-150 flex items-start gap-3 group overflow-hidden ${
        selected
          ? "border-[#142b6f] bg-[#f0f3ff] shadow-[0_0_0_2px_rgba(20,43,111,0.12)]"
          : !n.is_read
            ? "bg-white border-[#f5c518]/50 shadow-[0_0_0_3px_rgba(245,197,24,0.08)]"
            : "bg-white border-[#e8e4dc] hover:border-[#d8d4cc]"
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onSelect(); }}
        className={`shrink-0 flex items-center justify-center mt-4 ml-4 w-5 h-5 rounded-lg border-2 transition-all ${
          selected
            ? "border-[#142b6f] bg-[#142b6f]"
            : "border-[#e8e4dc] group-hover:border-[#142b6f]/40"
        }`}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Unread dot */}
      <div className="shrink-0 mt-[18px]">
        <span className={`block w-2 h-2 rounded-full ${!n.is_read ? cfg.dot : "bg-transparent"}`} />
      </div>

      {/* Content — clickable to open */}
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 text-left py-4 pr-3 space-y-1.5"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border ${cfg.badge}`}>
            {n.type}
          </span>
          {!n.is_read && (
            <span className="text-[9px] font-black text-[#f5c518] uppercase tracking-wide">New</span>
          )}
        </div>
        <p className={`text-[13px] leading-snug line-clamp-2 ${!n.is_read ? "font-semibold text-[#0d0d0d]" : "font-medium text-[#0d0d0d]/70"}`}>
          {n.message}
        </p>
        <p className="text-[11px] text-[#0d0d0d]/30">
          {new Date(n.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
        </p>
      </button>

      {/* Delete button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        disabled={deleting}
        title="Delete"
        className="shrink-0 mt-3 mr-3 w-8 h-8 rounded-xl flex items-center justify-center text-[#0d0d0d]/25 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-30"
      >
        {deleting ? (
          <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
      </button>
    </motion.div>
  );
}

/* ── Main content ─────────────────────────────────────────── */
function NotificationsContent() {
  const { t }   = useLanguage();
  const router  = useRouter();
  const params  = useSearchParams();
  const notifId = params.get("notification");

  const { data, isLoading, refetch } = useNotifications({ limit: 100 });
  const markOne    = useMarkAsRead();
  const markAll    = useMarkAllAsRead();

  const [bulkSelected, setBulkSelected]   = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting]   = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  const active = useMemo(
    () => (notifId && data?.notifications ? data.notifications.find(n => n.id === notifId) ?? null : null),
    [notifId, data],
  );

  const list   = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  const allSelected = list.length > 0 && list.every(n => bulkSelected.has(n.id));

  const toggleSelect = (id: string) =>
    setBulkSelected(p => { const n = new Set(p); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const toggleAll = () =>
    setBulkSelected(allSelected ? new Set() : new Set(list.map(n => n.id)));

  const handleOpen = (n: Notification) => {
    router.replace(`/dashboard/student/notifications?notification=${n.id}`, { scroll: false });
    if (!n.is_read) markOne.mutate(n.id);
  };

  const handleClose = () =>
    router.replace("/dashboard/student/notifications", { scroll: false });

  const handleMarkAll = async () => {
    try { await markAll.mutateAsync(); toast.success(String(t("student_notifications.success_mark_all"))); }
    catch { toast.error(String(t("student_notifications.failed_mark_all"))); }
  };

  const handleDeleteOne = async (id: string) => {
    setDeletingId(id);
    try {
      await fetchApi(`/notifications/${id}`, { method: "DELETE" });
      setBulkSelected(p => { const n = new Set(p); n.delete(id); return n; });
      toast.success("Notification deleted");
      await refetch();
    } catch(e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally { setDeletingId(null); }
  };

  const handleBulkDelete = async () => {
    if (!bulkSelected.size) return;
    setBulkDeleting(true);
    const ids = Array.from(bulkSelected);
    let success = 0;
    try {
      for (const id of ids) {
        await fetchApi(`/notifications/${id}`, { method: "DELETE" });
        success++;
      }
      toast.success(`Deleted ${success} notification${success > 1 ? "s" : ""}`);
      setBulkSelected(new Set());
      await refetch();
    } catch(e) {
      if (success > 0) { toast.success(`Deleted ${success} of ${ids.length}`); await refetch(); }
      toast.error(e instanceof Error ? e.message : "Failed to delete some");
    } finally { setBulkDeleting(false); }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-4">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Inbox</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
            {String(t("student_notifications.title"))}
          </h1>
          {list.length > 0 && (
            <p className="text-sm text-[#0d0d0d]/40 mt-1">
              {list.length} total{unread > 0 ? ` · ${unread} unread` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unread > 0 && (
            <button onClick={handleMarkAll} disabled={markAll.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e8e4dc] text-[11px] font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 disabled:opacity-50 transition-colors">
              <CheckCheck size={13} />
              {markAll.isPending ? "Marking…" : String(t("student_notifications.mark_all"))}
            </button>
          )}
        </div>
      </motion.div>

      {/* Select-all + bulk bar */}
      {list.length > 0 && (
        <motion.div variants={fadeUp}>
          {bulkSelected.size > 0 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="text-[12px] font-bold text-red-700">
                {bulkSelected.size} selected
              </span>
              <div className="flex gap-2">
                <button onClick={() => setBulkSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                  Clear
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  <Trash2 size={12} />
                  {bulkDeleting ? "Deleting…" : `Delete ${bulkSelected.size}`}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e4dc] text-[11px] font-bold text-[#0d0d0d]/45 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 transition-colors">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${allSelected ? "border-[#142b6f] bg-[#142b6f]" : "border-[#e8e4dc]"}`}>
                {allSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              Select all
            </button>
          )}
        </motion.div>
      )}

      {/* List */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-[#e8e4dc] p-4 h-20 animate-pulse" />)}
          </motion.div>
        ) : list.length > 0 ? (
          <motion.div key="list" variants={stagger} initial="hidden" animate="show" className="space-y-2 pb-10">
            {list.map(n => (
              <NotifItem
                key={n.id} n={n}
                selected={bulkSelected.has(n.id)}
                onSelect={() => toggleSelect(n.id)}
                onOpen={() => handleOpen(n)}
                onDelete={() => handleDeleteOne(n.id)}
                deleting={deletingId === n.id}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" variants={fadeUp}
            className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-14 text-center">
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_notifications.no_notifications"))}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationOverlay notification={active} isOpen={!!active} onClose={handleClose} refetch={refetch} />
    </motion.div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-6 sm:px-6 space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-[#e8e4dc] animate-pulse" />)}
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  );
}
