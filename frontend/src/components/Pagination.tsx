"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export const Pagination = ({ currentPage, totalPages, onPageChange }: Props) => {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  return (
    <div className="flex items-center justify-center gap-2 py-10">
      {/* Prev */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label={t("common.pagination.previous") as string}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </motion.button>

      {/* Page numbers */}
      <div className="flex items-center gap-1.5">
        {pages.map((page, i) => {
          if (page === "...") {
            return (
              <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-[#9ca3af] font-bold">
                …
              </span>
            );
          }
          const isActive = page === currentPage;
          return (
            <motion.button
              key={page}
              whileHover={isActive ? {} : { scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onPageChange(page)}
                    className={`relative w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                isActive
                  ? "bg-[#0d0d0d] text-white shadow-[0_4px_12px_rgba(0,0,0,0.22)]"
                  : "border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="page-active"
                  className="absolute inset-0 rounded-xl bg-[#0d0d0d]"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              {page}
            </motion.button>
          );
        })}
      </div>

      {/* Next */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label={t("common.pagination.next") as string}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e0e7] bg-white text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </motion.button>
    </div>
  );
};
