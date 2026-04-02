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

type SystemConfig = {
  daily_fine: string | number;
};

type Props = {
  rentals: RentalItem[];
  config: SystemConfig | null;
  loading?: boolean;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const daysBetween = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

type TranslateFn = (path: string, variables?: Record<string, string | number>) => string;

const getStatusDisplay = (status: string, t: TranslateFn) => {
  switch (status) {
    case "BORROWED":
      return { text: t("student_history.table.status_borrowed"), color: "bg-amber-100 text-amber-700" };
    case "PENDING":
      return { text: t("student_history.table.status_pending"), color: "bg-orange-100 text-orange-700" };
    case "RETURNED":
      return { text: t("student_history.table.status_returned"), color: "bg-green-100 text-green-700" };
    case "COMPLETED":
      return { text: t("student_history.table.status_completed"), color: "bg-blue-100 text-blue-700" };
    default:
      return { text: status, color: "bg-gray-100 text-gray-700" };
  }
};

export const DetailedHistoryTable = ({ rentals, config, loading }: Props) => {
  const { t } = useLanguage();
  void config;
  const rows = rentals.map((r) => {
    const returned = r.return_date ? formatDate(r.return_date) : "---";
    const days = r.return_date
      ? daysBetween(r.loan_date, r.return_date)
      : r.status === "BORROWED"
        ? daysBetween(r.loan_date, new Date().toISOString())
        : 0;

    // Amount paid is either from payment or fine
    const amount = r.payment?.amount ?? r.fine ?? 0;
    const statusDisplay = getStatusDisplay(r.status, t);

    return {
      id: r.id,
      bookId: r.physical_book.id,
      title: r.physical_book.title,
      borrowedDate: formatDate(r.loan_date),
      returnedDate: returned,
      daysKept: days > 0 ? t("student_history.summary.days_suffix", { count: days }) : "---",
      amountPaid:
        amount > 0
          ? t("student_history.summary.birr", { amount: Number(amount).toFixed(1) })
          : t("student_history.summary.birr", { amount: 0 }),
      status: statusDisplay.text,
      statusColor: statusDisplay.color,
    };
  });

  type HistoryRow = (typeof rows)[number];
  const columns: ColumnDef<HistoryRow, unknown>[] = [
    {
      id: "title",
      header: t("student_history.table.title"),
      cell: ({ row }) => <span className="font-bold text-primary">{row.original.title}</span>,
    },
    {
      id: "borrowed_date",
      header: t("student_history.table.borrowed_date"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.borrowedDate}</span>,
    },
    {
      id: "returned_date",
      header: t("student_history.table.returned_date"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.returnedDate}</span>,
    },
    {
      id: "days_kept",
      header: t("student_history.table.days_kept"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.daysKept}</span>,
    },
    {
      id: "amount_paid",
      header: t("student_history.table.amount_paid"),
      cell: ({ row }) => <span className="font-extrabold text-primary">{row.original.amountPaid}</span>,
    },
    {
      id: "status",
      header: t("student_history.table.status"),
      cell: ({ row }) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.original.statusColor}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "action",
      header: t("student_history.table.action"),
      cell: ({ row }) => (
        <div className="text-right">
          <Link
            href={`/books/${row.original.bookId}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border bg-card text-[11px] font-bold text-secondary hover:text-primary hover:border-primary transition-all whitespace-nowrap"
          >
            {t("student_history.table.see_detail")}
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif font-extrabold text-primary">{t("student_history.title")}</h3>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        <TanStackTable
          data={rows}
          columns={columns}
          isLoading={loading}
          emptyText={t("student_history.table.empty_message")}
          skeletonRows={5}
        />
      </div>
    </div>
  );
};
