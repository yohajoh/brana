"use client";

// StatsBand uses public endpoints that don't need auth
// /books?limit=1 gives total count, /categories gives category count
// /stats/overview is admin-only — never call it from public pages

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";

export const StatsBand = () => {
  const { t } = useLanguage();

  // Use public-safe endpoints to derive counts
  const { data: booksData } = useQuery({
    queryKey: ["public-band-books"],
    queryFn: () => fetchApi("/books?limit=1"),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const { data: digitalData } = useQuery({
    queryKey: ["public-band-digital"],
    queryFn: () => fetchApi("/digital-books?limit=1"),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const { data: catData } = useQuery({
    queryKey: ["public-band-cats"],
    queryFn: () => fetchApi("/categories?limit=100"),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const totalBooks    = (booksData as { total?: number })?.total;
  const totalDigital  = (digitalData as { total?: number })?.total;
  const totalCats     = (catData as { categories?: unknown[] })?.categories?.length;
  const combined      = totalBooks !== undefined && totalDigital !== undefined
    ? totalBooks + totalDigital
    : totalBooks ?? totalDigital;

  const stats = [
    {
      value: combined !== undefined ? `${combined.toLocaleString()}+` : "2,400+",
      label: t("stats_band.books") as string,
    },
    {
      value: totalCats !== undefined ? `${totalCats}` : "12+",
      label: t("stats_band.categories") as string,
    },
    {
      value: "8,000+",
      label: t("stats_band.borrowed") as string,
    },
    {
      value: "1,800+",
      label: t("stats_band.students") as string,
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
              <div className="text-2xl sm:text-3xl font-serif font-black text-[#142b6f] leading-none mb-1">
                {value}
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
