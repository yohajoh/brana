"use client";

import type { Rental, SystemConfig } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Props = {
  rental: Rental | null;
  totalOwed: number;
  config: SystemConfig | null;
  loading?: boolean;
};

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export const AmountOwed = ({ rental, totalOwed, config, loading }: Props) => {
  const { t } = useLanguage();
  const dailyFine  = config ? Number(config.daily_fine) : 0;
  const daysBorrowed = rental?.loan_date
    ? daysBetween(rental.loan_date, rental.return_date || new Date().toISOString())
    : 0;
  const isOwed = totalOwed > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e6e1] p-5 space-y-3 animate-pulse">
        <div className="h-3 bg-[#f0eeea] rounded w-1/2" />
        <div className="h-16 bg-[#f0eeea] rounded-xl" />
        <div className="h-8 bg-[#f0eeea] rounded-xl" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${
      isOwed ? "border-red-200" : "border-[#e8e6e1]"
    }`}>
      <div className={`h-[3px] ${isOwed ? "bg-red-400" : "bg-[#f5c518]"}`} />
      <div className="p-5 space-y-4">
        <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-[0.18em]">
          {String(t("shared.amount_owed.title"))}
        </p>

        {/* Hero number */}
        <div className={`rounded-xl p-4 text-center border ${
          isOwed
            ? "bg-red-50 border-red-100"
            : "bg-[#fdf9e7] border-[#f5c518]/20"
        }`}>
          <p className={`text-[28px] font-serif font-black leading-none ${
            isOwed ? "text-red-600" : "text-[#0d0d0d]"
          }`}>
            {String(t("shared.amount_owed.birr", { amount: totalOwed.toFixed(1) }))}
          </p>
          <p className="text-[9px] font-bold text-[#0d0d0d]/40 uppercase tracking-wider mt-1.5">
            {String(t("shared.amount_owed.total_owed"))}
          </p>
        </div>

        {/* Breakdown */}
        <div className="divide-y divide-[#e8e6e1]/60">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-xs text-[#0d0d0d]/50">
              {String(t("shared.amount_owed.daily_fine"))}
            </span>
            <span className="text-xs font-bold text-[#0d0d0d]">
              {String(t("shared.amount_owed.per_day", { amount: dailyFine.toFixed(1) }))}
            </span>
          </div>
          {rental && (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-[#0d0d0d]/50">
                {String(t("shared.amount_owed.days_borrowed"))}
              </span>
              <span className="text-xs font-bold text-[#0d0d0d]">
                {String(t("shared.amount_owed.days", { count: daysBorrowed }))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
