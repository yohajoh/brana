"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

type RentalItem = {
  id: string;
  loan_date: string;
  return_date: string | null;
  status: string;
  fine: number | null;
  payment?: { amount: number; status: string } | null;
};

type SystemConfig = { daily_fine: string | number; max_loan_days: number };

type Props = { rentals: RentalItem[]; config: SystemConfig | null; loading?: boolean };

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export const HistorySummary = ({ rentals, loading }: Props) => {
  const { t } = useLanguage();

  const totalBorrowed = rentals.length;
  const totalPaid = rentals.reduce((s, r) => {
    const p = r.payment?.amount ? Number(r.payment.amount) : 0;
    const f = r.fine ? Number(r.fine) : 0;
    return s + Math.max(p, f);
  }, 0);
  const avgCost = totalBorrowed > 0 ? totalPaid / totalBorrowed : 0;
  const totalDays = rentals.reduce((s, r) => {
    if (r.return_date) return s + daysBetween(r.loan_date, r.return_date);
    if (r.status === "BORROWED") return s + daysBetween(r.loan_date, new Date().toISOString());
    return s;
  }, 0);

  const stats = [
    { label: String(t("student_history.summary.total_borrowed")), value: totalBorrowed.toString(), sub: "books read" },
    { label: String(t("student_history.summary.total_paid")),     value: String(t("student_history.summary.birr", { amount: totalPaid.toFixed(1) })), sub: "total fees" },
    { label: String(t("student_history.summary.avg_cost")),       value: String(t("student_history.summary.birr", { amount: avgCost.toFixed(1) })),   sub: "per book" },
    { label: String(t("student_history.summary.total_reading_days")), value: String(t("student_history.summary.days_suffix", { count: totalDays })), sub: "active reading" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-[#e8e6e1] p-5 animate-pulse">
            <div className="h-7 w-12 bg-[#f0eeea] rounded mb-2" />
            <div className="h-3 w-20 bg-[#f0eeea] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#e8e6e1] p-5">
          <p className="text-[22px] font-serif font-black text-[#0d0d0d] leading-none">{s.value}</p>
          <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-[0.15em] mt-2">{s.label}</p>
        </div>
      ))}
    </div>
  );
};
