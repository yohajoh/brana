"use client";

import React from "react";
import type { Rental, SystemConfig } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Props = {
  rental: Rental | null;
  totalOwed: number;
  config: SystemConfig | null;
  loading?: boolean;
};

const daysBetween = (start: string, end: string) =>
  Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  );

export const AmountOwed = ({ rental, totalOwed, config, loading }: Props) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm space-y-4 animate-pulse h-full">
        <div className="h-6 bg-muted/50 rounded w-1/2" />
        <div className="h-12 bg-muted/50 rounded" />
        <div className="h-12 bg-muted/50 rounded" />
      </div>
    );
  }

  const dailyFine = config ? Number(config.daily_fine) : 0;
  const daysBorrowed = rental && rental.loan_date
    ? daysBetween(rental.loan_date, rental.return_date || new Date().toISOString())
    : 0;

  return (
    <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm space-y-8 h-full">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        {t("shared.amount_owed.title")}
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
          <span className="text-sm font-medium text-secondary">
            {t("shared.amount_owed.daily_fine")}
          </span>
          <span className="text-sm font-bold text-primary">
            {t("shared.amount_owed.per_day", { amount: dailyFine.toFixed(1) })}
          </span>
        </div>

        {rental && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/20">
            <span className="text-sm font-medium text-secondary">
              {t("shared.amount_owed.days_borrowed")}
            </span>
            <span className="text-sm font-bold text-primary">
              {t("shared.amount_owed.days", { count: daysBorrowed })}
            </span>
          </div>
        )}

        <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
          <span className="text-sm font-bold text-primary uppercase tracking-wider">
            {t("shared.amount_owed.total_owed")}
          </span>
          <div className="text-2xl font-serif font-extrabold text-primary">
            {t("shared.amount_owed.birr", { amount: totalOwed.toFixed(1) })}
          </div>
        </div>
      </div>
    </div>
  );
};
