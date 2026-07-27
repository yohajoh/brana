"use client";

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
  const { data, isLoading } = useMyReservations();
  const cancel             = useCancelReservation();
  const rows: Reservation[] = (data?.reservations || []) as unknown as Reservation[];
  const active   = rows.filter(r => ["QUEUED","NOTIFIED"].includes(r.status)).length;
  const notified = rows.filter(r => r.status === "NOTIFIED").length;

  const handleCancel = async (id: string) => {
    try { await cancel.mutateAsync(id); toast.success(String(t("student_reservations.success_cancel"))); }
    catch  { toast.error(String(t("student_reservations.error_cancel"))); }
  };

  const cols: ColumnDef<Reservation, unknown>[] = [
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
