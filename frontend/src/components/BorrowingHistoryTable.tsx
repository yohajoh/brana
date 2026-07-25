"use client";
"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { Rental } from "@/lib/hooks/useQueries";

type Props = { rentals: Rental[]; loading?: boolean };

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export const BorrowingHistoryTable = ({ rentals, loading }: Props) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-[0.18em]">
          {String(t("student_dashboard.history.title"))}
        </p>
        <Link
          href="/dashboard/student/history"
          className="text-[11px] font-bold text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"
        >
          {String(t("student_dashboard.history.see_all"))} →
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden divide-y divide-[#e8e6e1]/60">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#f0eeea] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[#f0eeea] rounded w-2/3" />
                <div className="h-2.5 bg-[#f0eeea] rounded w-1/3" />
              </div>
              <div className="h-3 bg-[#f0eeea] rounded w-14 shrink-0" />
            </div>
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-8 text-center">
          <p className="text-sm text-[#0d0d0d]/35">
            {String(t("student_dashboard.history.none"))}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden divide-y divide-[#e8e6e1]/60">
          {rentals.map((r) => {
            const title   = r.physical_book?.title || r.book?.title || "Unknown";
            const amount  = Number(r.payment?.amount ?? r.fine ?? 0);
            const days    = r.return_date && r.loan_date
              ? daysBetween(r.loan_date, r.return_date)
              : 0;

            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#faf9f6] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f5c518] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{title}</p>
                  <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">
                    {r.loan_date ? fmt(r.loan_date) : "—"}
                    {r.return_date ? ` → ${fmt(r.return_date)}` : ""}
                    {days > 0 && <span className="ml-1.5 opacity-50">· {days}d</span>}
                  </p>
                </div>
                <p className={`text-[12px] font-bold shrink-0 ${amount > 0 ? "text-red-500" : "text-[#0d0d0d]/30"}`}>
                  {amount > 0 ? `${amount.toFixed(1)} ETB` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
