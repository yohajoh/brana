"use client";
"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

type RentalItem = {
  id: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: "BORROWED" | "PENDING" | "RETURNED" | "COMPLETED";
  fine: number | null;
  physical_book: { id: string; title: string; cover_image_url: string; pages: number };
  payment?: { amount: number; status: string } | null;
};

type SystemConfig = { daily_fine: string | number };
type Props = { rentals: RentalItem[]; config: SystemConfig | null; loading?: boolean };

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

const statusStyle = (s: string) => {
  switch (s) {
    case "BORROWED":  return "bg-amber-100 text-amber-800";
    case "PENDING":   return "bg-orange-100 text-orange-800";
    case "RETURNED":  return "bg-emerald-100 text-emerald-800";
    case "COMPLETED": return "bg-[#f0eeea] text-[#0d0d0d]/60";
    default:          return "bg-[#f0eeea] text-[#0d0d0d]/60";
  }
};

export const DetailedHistoryTable = ({ rentals, loading }: Props) => {
  const { t } = useLanguage();

  const rows = rentals.map(r => ({
    id:           r.id,
    bookId:       r.physical_book.id,
    title:        r.physical_book.title,
    borrowed:     fmt(r.loan_date),
    returned:     r.return_date ? fmt(r.return_date) : "—",
    days:         r.return_date
                    ? daysBetween(r.loan_date, r.return_date)
                    : r.status === "BORROWED"
                      ? daysBetween(r.loan_date, new Date().toISOString())
                      : 0,
    amount:       Number(r.payment?.amount ?? r.fine ?? 0),
    status:       r.status,
  }));

  type Row = typeof rows[number];

  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: "title",
      header: String(t("student_history.table.title")),
      cell: ({ row }) => (
        <span className="text-[13px] font-semibold text-[#0d0d0d] line-clamp-1">{row.original.title}</span>
      ),
    },
    {
      id: "borrowed",
      header: String(t("student_history.table.borrowed_date")),
      cell: ({ row }) => <span className="text-[12px] text-[#0d0d0d]/50">{row.original.borrowed}</span>,
    },
    {
      id: "returned",
      header: String(t("student_history.table.returned_date")),
      cell: ({ row }) => <span className="text-[12px] text-[#0d0d0d]/50">{row.original.returned}</span>,
    },
    {
      id: "days",
      header: String(t("student_history.table.days_kept")),
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/50">
          {row.original.days > 0 ? String(t("student_history.summary.days_suffix", { count: row.original.days })) : "—"}
        </span>
      ),
    },
    {
      id: "amount",
      header: String(t("student_history.table.amount_paid")),
      cell: ({ row }) => (
        <span className={`text-[12px] font-bold ${row.original.amount > 0 ? "text-red-600" : "text-[#0d0d0d]/40"}`}>
          {row.original.amount > 0
            ? String(t("student_history.summary.birr", { amount: row.original.amount.toFixed(1) }))
            : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: String(t("student_history.table.status")),
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusStyle(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/books/${row.original.bookId}`}
          className="text-[11px] font-bold text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors whitespace-nowrap"
        >
          {String(t("student_history.table.see_detail"))} →
        </Link>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden">
      <TanStackTable
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyText={String(t("student_history.table.empty_message"))}
        skeletonRows={5}
      />
    </div>
  );
};
