"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";

type TrendingBook = {
  book: {
    id: string;
    title: string;
    cover_image_url?: string;
    available?: number;
    author?: { name?: string };
    category?: { name?: string };
  };
  rentalCount: number;
};

type PopularityResponse = {
  data: {
    trending: TrendingBook[];
    mostRented: TrendingBook[];
    topRated: Array<{
      book: { id: string; title: string; cover_image_url?: string; author?: { name?: string } };
      avgRating: number;
      reviewCount: number;
    }>;
  };
};

function useHomePageData() {
  return useQuery<PopularityResponse>({
    queryKey: ["home-popularity"],
    queryFn: () => fetchApi("/student/popularity?limit=12"),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export const MostBorrowed = () => {
  const { t } = useLanguage();
  const { data, isLoading } = useHomePageData();
  const trending = data?.data?.trending ?? [];
  const topRated = data?.data?.topRated ?? [];

  return (
    <section className="w-full bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c518] mb-2">
              {t("most_borrowed.eyebrow") as string}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight">
              {t("most_borrowed.title") as string}
            </h2>
          </div>
          <Link
            href="/books"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-[#374151] hover:text-[#0d0d0d] transition-colors group"
          >
            {t("most_borrowed.all_books") as string}
            <ArrowRightSmall className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <RecentBooksGrid unavailableLabel={t("most_borrowed.unavailable") as string} />
        ) : (
          <>
            {/* Trending grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 mb-10">
              {trending.map((item, i) => (
                <motion.div
                  key={item.book.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link href={`/books/${item.book.id}`} className="group block">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)] group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.16)] transition-shadow">
                      <Image
                        src={item.book.cover_image_url || "/reading_illustration.png"}
                        alt={item.book.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#f5c518] flex items-center justify-center">
                        <span className="text-[9px] font-black text-[#0d0d0d]">#{i + 1}</span>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-[#0d0d0d] line-clamp-2 group-hover:text-[#142b6f] transition-colors mb-0.5 leading-snug">
                      {item.book.title}
                    </h3>
                    <p className="text-[11px] text-[#6b7280]">
                      {item.book.author?.name ?? ""}
                    </p>
                    {item.rentalCount > 0 && (
                      <p className="text-[10px] font-bold text-[#142b6f]/60 mt-1">
                        {item.rentalCount} {t("most_borrowed.borrows") as string}
                      </p>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Top rated row */}
            {topRated.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-[#e2e0e7]" />
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#374151]/60">
                    {t("most_borrowed.top_rated") as string}
                  </p>
                  <div className="h-px flex-1 bg-[#e2e0e7]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topRated.slice(0, 6).map((item, i) => (
                    <motion.div
                      key={item.book.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={`/books/${item.book.id}`}
                        className="group flex items-center gap-4 p-4 rounded-2xl border border-[#e2e0e7] hover:border-[#142b6f]/20 hover:shadow-[0_4px_16px_rgba(20,43,111,0.07)] transition-all bg-white"
                      >
                        <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm">
                          <Image
                            src={item.book.cover_image_url || "/reading_illustration.png"}
                            alt={item.book.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-[#0d0d0d] line-clamp-1 group-hover:text-[#142b6f] transition-colors">
                            {item.book.title}
                          </h4>
                          <p className="text-xs text-[#6b7280] mb-1.5">{item.book.author?.name}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <span key={s} className={`text-[11px] ${s < Math.round(item.avgRating) ? "text-[#f5c518]" : "text-[#e2e0e7]"}`}>★</span>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-[#374151]">{item.avgRating.toFixed(1)}</span>
                            <span className="text-[10px] text-[#9ca3af]">({item.reviewCount})</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

function RecentBooksGrid({ unavailableLabel }: { unavailableLabel: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-books"],
    queryFn: () => fetchApi("/books?limit=6&sort=-created_at"),
    staleTime: 5 * 60 * 1000,
  });
  type BookItem = { id: string; title: string; cover_image_url?: string; author?: { name?: string }; available?: number };
  const books = (data as { books?: BookItem[] })?.books ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton aspect-[2/3] rounded-xl" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
      {books.map((book, i) => (
        <motion.div
          key={book.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.07 }}
        >
          <Link href={`/books/${book.id}`} className="group block">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)] group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.16)] transition-shadow">
              <Image
                src={book.cover_image_url || "/reading_illustration.png"}
                alt={book.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {book.available === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white bg-black/60 px-2 py-0.5 rounded-full">
                    {unavailableLabel}
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-xs font-bold text-[#0d0d0d] line-clamp-2 group-hover:text-[#142b6f] transition-colors leading-snug">
              {book.title}
            </h3>
            {book.author?.name && (
              <p className="text-[11px] text-[#6b7280] mt-0.5">{book.author.name}</p>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function ArrowRightSmall({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
