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

export default function StudentReservationsPage() {
  const { t } = useLanguage();
  const { data: reservationsData, isLoading } = useMyReservations();
  const cancelReservation = useCancelReservation();

  const rows: Reservation[] = (reservationsData?.reservations || []) as unknown as Reservation[];

  const columns: ColumnDef<Reservation, unknown>[] = [
    {
      id: "book",
      header: t("admin_reservations.table.book"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-primary">{row.original.book.title}</p>
          <p className="text-xs text-secondary">{row.original.book.author?.name}</p>
        </div>
      ),
    },
    {
      id: "queue",
      header: t("admin_reservations.table.queue"),
      cell: ({ row }) => <span className="text-sm text-primary/80">#{row.original.queue_position}</span>,
    },
    {
      id: "status",
      header: t("admin_reservations.table.status"),
      cell: ({ row }) => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary w-fit block">
          {row.original.status}
        </span>
      ),
    },
    {
      id: "expires",
      header: t("admin_reservations.table.expires"),
      cell: ({ row }) => (
        <span className="text-sm text-primary/70">
          {row.original.expires_at ? new Date(row.original.expires_at).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      id: "action",
      header: t("admin_reservations.table.action"),
      cell: ({ row }) => (
        <button
          disabled={!(["QUEUED", "NOTIFIED"] as string[]).includes(row.original.status)}
          onClick={() => handleCancel(row.original.id)}
          className="px-3 py-1.5 text-xs font-bold text-primary border border-border rounded-lg disabled:opacity-40"
        >
          {cancelReservation.isPending && cancelReservation.variables === row.original.id
            ? t("student_reservations.cancelling")
            : t("student_reservations.cancel")}
        </button>
      ),
    },
  ];

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation.mutateAsync(id);
      toast.success(t("student_reservations.success_cancel"));
    } catch {
      toast.error(t("student_reservations.error_cancel"));
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-primary">
          {t("student_reservations.title")}
        </h1>
        <p className="text-secondary font-medium">{t("student_reservations.subtitle")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
        <TanStackTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          emptyText={t("student_reservations.no_reservations")}
          skeletonRows={4}
        />
      </div>
    </div>
  );
}
