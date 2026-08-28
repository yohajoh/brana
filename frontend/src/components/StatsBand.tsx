"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";

type PublicStats = {
  status: string;
  data: {
    totalBooks: number;
    totalCategories: number;
    totalStudents: number;
    totalRentals: number;
  };
};

export const StatsBand = () => {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => fetchApi("/public/stats"),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const s = data?.data;

  const stats = [
    {
      value: s != null && s.totalBooks     != null ? `${s.totalBooks.toLocaleString()}+`    : null,
      label: t("stats_band.books")      as string,
    },
    {
      value: s != null && s.totalCategories != null ? `${s.totalCategories}`                : null,
      label: t("stats_band.categories") as string,
    },
    {
      value: s != null && s.totalRentals    != null ? `${s.totalRentals.toLocaleString()}+` : null,
      label: t("stats_band.borrowed")   as string,
    },
    {
      value: s != null && s.totalStudents   != null ? `${s.totalStudents.toLocaleString()}+`: null,
      label: t("stats_band.students")   as string,
    },
  ];

  return (
    <div className="w-full bg-white border-b border-[#e2e0e7]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#e2e0e7]">
          {stats.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="px-6 py-6 text-center lg:text-left"
            >
              <div className="text-2xl sm:text-3xl font-serif font-black text-[#142b6f] leading-none mb-1 min-h-[36px]">
                {isLoading || value === null ? (
                  <span className="inline-block w-16 h-7 rounded-lg bg-[#e2e0e7] animate-pulse" />
                ) : (
                  value
                )}
              </div>
              <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
