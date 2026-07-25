"use client";

import { useMyReservations, useCancelReservation } from "@/lib/hooks/useQueries";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";

type Reservation = {
  id: string;
  queue_position: number;
  status: "QUEUED" | "NOTIFIED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  reserved_at: string;
  expires_at?: string | null;
  book: { title: string; cover_image_url: string; author: { name: string } };
};

const statusStyle = (s: string) => {
  switch (s) {
    case "NOTIFIED":  return "bg-[#fdf9e7] text-[#a07c00]";
    case "FULFILLED": return "bg-emerald-100 text-emerald-700";
    case "EXPIRED":
    case "CANCELLED": return "bg-[#f0eeea] text-[#0d0d0d]/40";
    default:          return "bg-[#f0eeea] text-[#0d0d0d]/60";
  }
};

export default function StudentReservationsPage() {
  const { t }              = useLanguage();
  const { data, isLoading } = useMyReservations();
  const cancel             = useCancelReservation();
  const rows: Reservation[] = (data?.reservations || []) as unknown as Reservation[];

  const handleCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      toast.success(String(t("student_reservations.success_cancel")));
    } catch {
      toast.error(String(t("student_reservations.error_cancel")));
    }
  };

  const columns: ColumnDef<Reservation, unknown>[] = [
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
        <span className="text-[13px] font-bold text-[#0d0d0d]">#{row.original.queue_position}</span>
      ),
    },
    {
      id: "status",
      header: String(t("admin_reservations.table.status")),
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusStyle(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "expires",
      header: String(t("admin_reservations.table.expires")),
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/40">
          {row.original.expires_at
            ? new Date(row.original.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <button
          disabled={!(["QUEUED","NOTIFIED"] as string[]).includes(row.original.status)}
          onClick={() => handleCancel(row.original.id)}
          className="text-[11px] font-bold text-[#0d0d0d]/40 hover:text-red-600 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          {cancel.isPending && cancel.variables === row.original.id
            ? String(t("student_reservations.cancelling"))
            : String(t("student_reservations.cancel"))}
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-7 sm:px-6 lg:px-8 space-y-7">
      <div>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Queue</p>
        <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_reservations.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_reservations.subtitle"))}</p>
      </div>
      <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden pb-4">
        <TanStackTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          emptyText={String(t("student_reservations.no_reservations"))}
          skeletonRows={4}
        />
      </div>
    </div>
  );
}
