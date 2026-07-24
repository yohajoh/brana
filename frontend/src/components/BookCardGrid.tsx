"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, Download, Eye } from "lucide-react";
import { motion } from "framer-motion";

type Book = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  copies: number;
  available: number;
  author: { id: string; name: string; image?: string | null };
  category: { id: string; name: string; slug: string };
  rating: { average: number; total: number };
  type?: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

type Props = {
  books: Book[];
  loading?: boolean;
  listQuery?: string;
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const BookCardGrid = ({ books, loading, listQuery = "" }: Props) => {
  const detailHref = (book: Book) => {
    const p = new URLSearchParams();
    if (book.type === "digital") p.set("type", "digital");
    if (listQuery) p.set("from", listQuery);
    const q = p.toString();
    return q ? `/books/${book.id}?${q}` : `/books/${book.id}`;
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[2/3] rounded-2xl bg-[#f1f0f4] animate-pulse" />
            <div className="h-3.5 rounded-lg bg-[#f1f0f4] animate-pulse w-4/5" />
            <div className="h-3 rounded-lg bg-[#f1f0f4] animate-pulse w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  /* ── Empty state ── */
  if (books.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-[#142b6f]/08 flex items-center justify-center mb-5">
          <BookOpen size={28} className="text-[#142b6f]/40" />
        </div>
        <h3 className="text-lg font-serif font-black text-[#0d0d0d] mb-2">No books found</h3>
        <p className="text-sm text-[#6b7280]">Try adjusting your search or filter criteria</p>
      </motion.div>
    );
  }

  /* ── Grid ── */
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8"
    >
      {books.map((book) => {
        const isDigital = book.type === "digital";
        const isAvailable = isDigital || book.available > 0;

        return (
          <motion.div key={book.id} variants={item}>
            <Link href={detailHref(book)} className="group block">
              {/* Cover */}
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.10)] group-hover:shadow-[0_10px_32px_rgba(20,43,111,0.18)] transition-all duration-300">
                <Image
                  src={book.cover_image_url || "/reading_illustration.png"}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Availability badge */}
                <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black backdrop-blur-sm ${
                  isDigital
                    ? "bg-[#142b6f]/90 text-white"
                    : isAvailable
                      ? "bg-emerald-500/90 text-white"
                      : "bg-red-500/90 text-white"
                }`}>
                  {isDigital ? (
                    book.pdf_access === "RESTRICTED"
                      ? <><Eye size={9} /> Read</>
                      : <><Download size={9} /> Free</>
                  ) : (
                    <>{book.available} left</>
                  )}
                </div>

                {/* Digital badge */}
                {isDigital && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-[#f5c518] text-[10px] font-black text-[#0d0d0d]">
                    Digital
                  </div>
                )}

                {/* Hover overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-[#142b6f]/55 flex items-end justify-center pb-5"
                >
                  <span className="text-white text-xs font-black tracking-wide uppercase bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/30">
                    View Details
                  </span>
                </motion.div>
              </div>

              {/* Info */}
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-[#0d0d0d] line-clamp-2 leading-snug group-hover:text-[#142b6f] transition-colors">
                  {book.title}
                </h3>
                <p className="text-[11px] text-[#6b7280] line-clamp-1">{book.author.name}</p>
                {book.rating.total > 0 && (
                  <div className="flex items-center gap-1 pt-0.5">
                    <Star size={10} fill="#f5c518" className="text-[#f5c518]" />
                    <span className="text-[10px] font-bold text-[#374151]">{book.rating.average.toFixed(1)}</span>
                    <span className="text-[10px] text-[#9ca3af]">({book.rating.total})</span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
