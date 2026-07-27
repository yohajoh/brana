"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMyReservations, useCancelReservation } from "@/lib/hooks/useQueries";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.07}} };

type Reservation = {
  id: string; queue_position: number;
  status: "QUEUED"|"NOTIFIED"|"FULFILLED"|"EXPIRED"|"CANCELLED";
  reserved_at: string; expires_at?: string | null;
  book: { title: string; cover_image_url: string; author: { name: string } };
};

const statusStyle = (s: string) => {
  switch (s) {
    case "NOTIFIED":  return "bg-[#fdf9e7] text-[#a07c00] border-[#f5c518]/30";
    case "FULFILLED": return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "EXPIRED":
    case "CANCELLED": return "bg-[#f5f4f0] text-[#0d0d0d]/35 border-[#e8e4dc]";
    default:          return "bg-[#f5f4f0] text-[#0d0d0d]/55 border-[#e8e4dc]";
  }
};

export default function StudentReservationsPage() {
  const { t }              = useLanguage();
  const { data, isLoading, refetch: refetchReservations } = useMyReservations();
  const cancel             = useCancelReservation();
  const rows: Reservation[] = (data?.reservations || []) as unknown as Reservation[];
  const active   = rows.filter(r => ["QUEUED","NOTIFIED"].includes(r.status)).length;
  const notified = rows.filter(r => r.status === "NOTIFIED").length;

  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkCancelling, setBulkCancelling] = useState(false);
  const cancellable = rows.filter(r => ["QUEUED","NOTIFIED"].includes(r.status));
  const allSelected = cancellable.length > 0 && cancellable.every(r => bulkSelected.has(r.id));
  const toggleBulk = (id: string) => setBulkSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setBulkSelected(allSelected ? new Set() : new Set(cancellable.map(r => r.id)));

  const handleBulkCancel = async () => {
    if (!bulkSelected.size) return;
    setBulkCancelling(true);
    const ids = Array.from(bulkSelected);
    let success = 0;
    try {
      for (const id of ids) { await cancel.mutateAsync(id); success++; }
      toast.success(`Cancelled ${success} reservation${success > 1 ? "s" : ""}`);
      setBulkSelected(new Set());
      await refetchReservations();
    } catch {
      if (success > 0) toast.success(`Cancelled ${success} of ${ids.length}`);
      toast.error(String(t("student_reservations.error_cancel")));
    } finally { setBulkCancelling(false); }
  };

  const handleCancel = async (id: string) => {
    try { await cancel.mutateAsync(id); toast.success(String(t("student_reservations.success_cancel"))); }
    catch  { toast.error(String(t("student_reservations.error_cancel"))); }
  };

  const cols: ColumnDef<Reservation, unknown>[] = [
    {
      id: "sel",
      header: () => (
        <input type="checkbox" checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]"
          onClick={e => e.stopPropagation()} />
      ),
      cell: ({ row }) => {
        const cancellableRow = ["QUEUED","NOTIFIED"].includes(row.original.status);
        return cancellableRow ? (
          <input type="checkbox" checked={bulkSelected.has(row.original.id)}
            onChange={() => toggleBulk(row.original.id)}
            className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]"
            onClick={e => e.stopPropagation()} />
        ) : null;
      },
    },
    {
      id: "book",
      header: String(t("admin_reservations.table.book")),
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-[#0d0d0d]">{row.original.book.title}</p>
          <p className="text-[11px] text-[#0d0d0d]/40">{row.original.book.author?.name}</p>
        </div>
      ),
    },
    {
      id: "queue",
      header: String(t("admin_reservations.table.queue")),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#0d0d0d] text-white text-[10px] font-black flex items-center justify-center shrink-0">
            {row.original.queue_position}
          </span>
          <span className="text-[12px] text-[#0d0d0d]/50">in queue</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${statusStyle(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "expires",
      header: "Expires",
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/40">
          {row.original.expires_at
            ? new Date(row.original.expires_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
            : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <button
          disabled={!(["QUEUED","NOTIFIED"] as string[]).includes(row.original.status) || cancel.isPending}
          onClick={() => handleCancel(row.original.id)}
          className="text-[11px] font-bold text-[#0d0d0d]/35 hover:text-red-500 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          {String(t("student_reservations.cancel"))}
        </button>
      ),
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-2 sm:p-4 lg:p-6 space-y-6">

      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Queue</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_reservations.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_reservations.subtitle"))}</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: rows.length },
          { label: "Active", value: active, hi: active > 0 },
          { label: "Ready to collect", value: notified, hi: notified > 0 },
        ].map(s => (
          <motion.div key={s.label} variants={fadeUp}
            className={`rounded-2xl border p-4 ${s.hi ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-[#e8e4dc]"}`}>
            <p className={`text-[24px] font-serif font-black leading-none ${s.hi ? "text-[#f5c518]" : "text-[#0d0d0d]"}`}>{s.value}</p>
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] mt-2 ${s.hi ? "text-white/40" : "text-[#0d0d0d]/35"}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp}
        className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden pb-2">
        {bulkSelected.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
            <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setBulkSelected(new Set())}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                Clear
              </button>
              <button onClick={handleBulkCancel} disabled={bulkCancelling}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {bulkCancelling ? "Cancelling…" : `Cancel ${bulkSelected.size}`}
              </button>
            </div>
          </div>
        )}
        <TanStackTable
          data={rows} columns={cols}
          isLoading={isLoading}
          emptyText={String(t("student_reservations.no_reservations"))}
          skeletonRows={4}
        />
      </motion.div>
    </motion.div>
  );
}
