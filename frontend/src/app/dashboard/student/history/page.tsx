"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMyRentals, useSystemConfig } from "@/lib/hooks/useQueries";
import { HistorySummary }       from "@/components/HistorySummary";
import { DetailedHistoryTable } from "@/components/DetailedHistoryTable";
import { Pagination }           from "@/components/Pagination";
import { useLanguage }          from "@/components/providers/LanguageProvider";

export type RentalItem = {
  id: string; loan_date: string; due_date: string;
  return_date: string | null;
  status: "BORROWED" | "PENDING" | "RETURNED" | "COMPLETED";
  fine: number | null; isOverdue?: boolean; daysOverdue?: number; daysUntilDue?: number | null;
  physical_book: { id: string; title: string; cover_image_url: string; pages: number };
  payment?: { id: string; amount: number; status: string; method: string } | null;
};
export type SystemConfig = { id: number; max_loan_days: number; daily_fine: string | number; max_books_per_user: number };

const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function BorrowingHistoryPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: rentalsData, isLoading } = useMyRentals(`page=${page}&limit=${limit}`);
  const { data: configData }             = useSystemConfig();

  const rentals: RentalItem[]     = (rentalsData?.rentals || []) as unknown as RentalItem[];
  const config:  SystemConfig|null = configData?.data?.config as unknown as SystemConfig | null;
  const totalPages = Math.max(1, Math.ceil((rentalsData?.total ?? rentals.length) / limit));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="px-4 py-6 sm:px-6 space-y-6 max-w-[1100px]">

      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">
          {String(t("student_dashboard.history.title"))}
        </p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_history.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_history.subtitle"))}</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <HistorySummary rentals={rentals} config={config} loading={isLoading} />
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden pb-2">
        <DetailedHistoryTable rentals={rentals} config={config} loading={isLoading} />
      </motion.div>

      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="pb-10">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </motion.div>
      )}
    </motion.div>
  );
}
