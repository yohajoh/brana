"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";

type StatsResponse = {
  data?: {
    totalBooks?: number;
    totalUsers?: number;
    totalCategories?: number;
    totalRentals?: number;
    activeRentals?: number;
  };
};

export const StatsBand = () => {
  const { data } = useQuery<StatsResponse>({
    queryKey: ["public-stats-band"],
    queryFn: () => fetchApi("/stats/overview"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const s = data?.data;

  const stats = [
    { value: s?.totalBooks    ? `${s.totalBooks.toLocaleString()}+`   : "2,400+", label: "Books in catalog"   },
    { value: s?.totalUsers    ? `${s.totalUsers.toLocaleString()}+`   : "1,800+", label: "Registered students" },
    { value: s?.totalRentals  ? `${s.totalRentals.toLocaleString()}+` : "8,000+", label: "Books borrowed"      },
    { value: s?.totalCategories ? `${s.totalCategories}`              : "12",     label: "Subject categories"  },
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
