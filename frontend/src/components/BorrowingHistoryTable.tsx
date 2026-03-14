"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Rental } from "@/lib/hooks/useQueries";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

type Props = {
  rentals: Rental[];
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

export const BorrowingHistoryTable = ({ rentals, loading }: Props) => {
  const { t } = useLanguage();
  const rows = rentals.map((r) => {
    const returned = r.return_date ? formatDate(r.return_date) : "—";
    const days = r.return_date && r.loan_date ? daysBetween(r.loan_date, r.return_date) : 0;
    const amount = r.payment?.amount ?? r.fine ?? 0;
    return {
      id: r.id,
      title: r.physical_book?.title || r.book?.title || "Unknown",
      borrowedDate: r.loan_date ? formatDate(r.loan_date) : "—",
      returnedDate: returned,
      daysKept: r.return_date ? t("shared.amount_owed.days", { count: days }) : "—",
      amountPaid: t("shared.amount_owed.birr", { amount: Number(amount).toFixed(1) }),
    };
  });

  type HistoryRow = (typeof rows)[number];
  const columns: ColumnDef<HistoryRow, unknown>[] = [
    {
      id: "title",
      header: t("student_dashboard.history.table.title"),
      cell: ({ row }) => <span className="font-bold text-primary">{row.original.title}</span>,
    },
    {
      id: "borrowed",
      header: t("student_dashboard.history.table.borrowed"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.borrowedDate}</span>,
    },
    {
      id: "returned",
      header: t("student_dashboard.history.table.returned"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.returnedDate}</span>,
    },
    {
      id: "days_kept",
      header: t("student_dashboard.history.table.days_kept"),
      cell: ({ row }) => <span className="text-secondary font-medium">{row.original.daysKept}</span>,
    },
    {
      id: "amount_paid",
      header: t("student_dashboard.history.table.amount_paid"),
      cell: ({ row }) => <span className="font-extrabold text-primary">{row.original.amountPaid}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-serif font-extrabold text-primary">{t("student_dashboard.history.title")}</h3>
        <Link
          href="/dashboard/student/history"
          className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition-colors group"
        >
          {t("student_dashboard.history.see_all")}
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        <TanStackTable
          data={rows}
          columns={columns}
          isLoading={loading}
          emptyText={t("student_dashboard.history.none")}
          skeletonRows={3}
        />
      </div>
    </div>
  );
};
