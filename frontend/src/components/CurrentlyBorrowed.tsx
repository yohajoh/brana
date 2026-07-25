"use client";

import Image from "next/image";
import type { Rental } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Props = {
  rental: Rental | null;
  dailyFine?: number;
  loading?: boolean;
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const CurrentlyBorrowed = ({ rental, loading }: Props) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden animate-pulse">
        <div className="p-5 flex gap-4">
          <div className="w-[68px] h-[96px] rounded-xl bg-[#f0eeea] shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-[#f0eeea] rounded w-3/4" />
            <div className="h-3 bg-[#f0eeea] rounded w-1/2" />
            <div className="flex gap-2 mt-4">
              <div className="h-12 bg-[#f0eeea] rounded-xl flex-1" />
              <div className="h-12 bg-[#f0eeea] rounded-xl flex-1" />
              <div className="h-12 bg-[#f0eeea] rounded-xl flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-8 text-center space-y-1.5">
        <p className="text-sm font-semibold text-[#0d0d0d]/50">
          {String(t("student_dashboard.borrowed.none"))}
        </p>
        <p className="text-xs text-[#0d0d0d]/30">
          {String(t("student_dashboard.borrowed.explore"))}
        </p>
      </div>
    );
  }

  const book = rental.physical_book;
  const loanDate = rental.loan_date ? fmt(rental.loan_date) : "—";
  const dueDate  = rental.due_date  ? fmt(rental.due_date)  : "—";
  const daysLeft   = rental.daysUntilDue ?? 0;
  const isOverdue  = rental.isOverdue    ?? false;
  const daysOverdue = rental.daysOverdue ?? 0;
  const title  = book?.title || rental.book?.title || "Unknown Book";
  const cover  = book?.cover_image_url || rental.book?.cover_image || "/auth/image.png";

  return (
    <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden">
      {/* top status bar */}
      <div className={`h-[3px] w-full ${
        isOverdue       ? "bg-red-500"
        : daysLeft <= 2 ? "bg-amber-400"
                        : "bg-[#f5c518]"
      }`} />

      <div className="p-5 flex gap-4">
        {/* Cover */}
        <div className="shrink-0">
          <div className="relative w-[68px] h-[96px] rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#e8e6e1]">
            <Image src={cover} alt={title} fill sizes="68px" className="object-cover" unoptimized />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-serif font-bold text-[#0d0d0d] text-[15px] leading-snug line-clamp-2">
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Loan date */}
            <div className="bg-[#f5f4f0] rounded-lg px-3 py-2 border border-[#e8e6e1]">
              <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-widest mb-0.5">
                {String(t("student_dashboard.borrowed.loan_date"))}
              </p>
              <p className="text-[12px] font-bold text-[#0d0d0d]">{loanDate}</p>
            </div>

            {/* Due date */}
            <div className="bg-[#f5f4f0] rounded-lg px-3 py-2 border border-[#e8e6e1]">
              <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-widest mb-0.5">
                {String(t("student_dashboard.borrowed.due_date"))}
              </p>
              <p className="text-[12px] font-bold text-[#0d0d0d]">{dueDate}</p>
            </div>

            {/* Status chip */}
            <div className={`rounded-lg px-3 py-2 border ${
              isOverdue        ? "bg-red-50   border-red-100"
              : daysLeft <= 2  ? "bg-amber-50 border-amber-100"
                               : "bg-[#fdf9e7] border-[#f5c518]/25"
            }`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                isOverdue       ? "text-red-500"
                : daysLeft <= 2 ? "text-amber-600"
                                : "text-[#a07c00]"
              }`}>
                {isOverdue
                  ? String(t("student_dashboard.borrowed.overdue_label"))
                  : String(t("student_dashboard.borrowed.remaining_label"))}
              </p>
              <p className={`text-[12px] font-bold ${
                isOverdue       ? "text-red-700"
                : daysLeft <= 2 ? "text-amber-700"
                                : "text-[#0d0d0d]"
              }`}>
                {isOverdue
                  ? String(t("shared.amount_owed.days", { count: daysOverdue }))
                  : String(t("student_dashboard.borrowed.days_left", { count: daysLeft }))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
