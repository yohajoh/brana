"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { books?: number };
};

// Simple deterministic colour palette — no randomness
const PALETTE = [
  { bg: "bg-[#142b6f]",   text: "text-white"      },
  { bg: "bg-[#f5c518]",   text: "text-[#0d0d0d]"  },
  { bg: "bg-[#0d0d0d]",   text: "text-white"      },
  { bg: "bg-[#e2e0e7]",   text: "text-[#0d0d0d]"  },
  { bg: "bg-[#142b6f]/10", text: "text-[#142b6f]" },
  { bg: "bg-[#f5c518]/20", text: "text-[#0d0d0d]" },
];

export const CategoriesStrip = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: () => fetchApi("/categories?limit=12"),
    staleTime: 10 * 60 * 1000,
  });

  const categories: Category[] =
    (data as { categories?: Category[] })?.categories ?? [];

  return (
    <section className="w-full bg-[#f8f7fb] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c518] mb-1.5">
              Browse by Subject
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] leading-tight">
              Find Your Next Read
            </h2>
          </div>
          <Link
            href="/books"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-[#374151] hover:text-[#0d0d0d] transition-colors group"
          >
            Browse all
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-1 transition-transform">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-28 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {categories.map((cat, i) => {
              const { bg, text } = PALETTE[i % PALETTE.length];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/books?category_id=${cat.id}`}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-md ${bg} ${text}`}
                  >
                    {cat.name}
                    {cat._count?.books !== undefined && (
                      <span className="opacity-60 text-xs font-semibold">
                        {cat._count.books}
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
