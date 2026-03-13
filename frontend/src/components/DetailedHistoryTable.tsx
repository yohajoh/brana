"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";

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

const getStatusDisplay = (status: string, t: any) => {
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
  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          {t("student_history.title")}
        </h3>
        <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
          <div className="p-8 animate-pulse">
            <div className="h-8 bg-muted/50 rounded mb-4 w-2/3" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          {t("student_history.title")}
        </h3>
        <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
          <div className="p-8 text-center text-secondary">
            {t("student_history.table.empty_message")}
          </div>
        </div>
      </div>
    );
  }

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
      amountPaid: amount > 0 ? t("student_history.summary.birr", { amount: Number(amount).toFixed(1) }) : t("student_history.summary.birr", { amount: 0 }),
      status: statusDisplay.text,
      statusColor: statusDisplay.color,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          {t("student_history.title")}
        </h3>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.title")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.borrowed_date")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.returned_date")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.days_kept")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.amount_paid")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                {t("student_history.table.status")}
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60 text-right">
                {t("student_history.table.action")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border/20">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-primary/2 transition-colors">
                <td className="px-6 py-5 font-bold text-primary">
                  {row.title}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.borrowedDate}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.returnedDate}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.daysKept}
                </td>
                <td className="px-6 py-5 font-extrabold text-primary">
                  {row.amountPaid}
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link
                    href={`/books/${row.bookId}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border bg-card text-[11px] font-bold text-secondary hover:text-primary hover:border-primary transition-all whitespace-nowrap"
                  >
                    {t("student_history.table.see_detail")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
