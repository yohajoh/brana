"use client";

import { Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { books: number; digital_books: number };
};

type Props = {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categorySlug: string | null) => void;
  loading?: boolean;
};

export const CategorySidebar = ({ categories, selectedCategory, onCategoryChange, loading }: Props) => {
  const { t } = useLanguage();
  const totalBooks = categories.reduce((sum, cat) => sum + cat._count.books, 0);

  return (
    <aside className="w-full lg:w-56 xl:w-60 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-[#0d0d0d] flex items-center justify-center">
          <Layers size={14} className="text-[#f5c518]" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#0d0d0d]">
          {t("books_page.sidebar_title") as string || "Categories"}
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-[#f1f0f4] animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ) : (
        <nav className="flex flex-col gap-1">
          {/* All Books */}
          <button
            onClick={() => onCategoryChange(null)}
            className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              selectedCategory === null
                ? "bg-[#0d0d0d] text-white shadow-[0_4px_12px_rgba(0,0,0,0.20)]"
                : "text-[#374151] hover:bg-[#0d0d0d]/05 hover:text-[#0d0d0d]"
            }`}
          >
            {selectedCategory === null && (
              <motion.span
                layoutId="cat-active"
                className="absolute inset-0 rounded-xl bg-[#0d0d0d]"
                style={{ zIndex: -1 }}
              />
            )}
            <span>{t("books_page.all_categories") as string || "All Books"}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              selectedCategory === null
                ? "bg-white/20 text-white"
                : "bg-[#0d0d0d]/06 text-[#374151]"
            }`}>
              {totalBooks}
            </span>
          </button>

          {/* Individual categories */}
          {categories.map((cat, i) => {
            const isSelected =
              (selectedCategory || "").trim().toLowerCase() === cat.slug.toLowerCase() ||
              (selectedCategory || "").trim().toLowerCase() === cat.name.toLowerCase();
            const count = cat._count.books;

            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onCategoryChange(cat.name)}
                className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-[#0d0d0d] text-white shadow-[0_4px_12px_rgba(0,0,0,0.20)]"
                    : "text-[#374151] hover:bg-[#0d0d0d]/05 hover:text-[#0d0d0d]"
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[#0d0d0d]/06 text-[#374151]"
                }`}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </nav>
      )}
    </aside>
  );
};
