"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useBooks } from "@/lib/hooks/useQueries";
import { motion } from "framer-motion";

export const Hero = () => {
  const { t } = useLanguage();

  // Pull real recently-added books for the visual strip
  const { data: booksData } = useBooks("limit=5&sort=-created_at");
  const recentBooks = (booksData?.books ?? []).slice(0, 4);

  return (
    <section className="relative w-full overflow-hidden bg-[#0d0d0d]">
      {/* Full-bleed editorial background image */}
      <div className="absolute inset-0">
        <Image
          src="/hero img.jpg"
          alt="Library"
          fill
          priority
          className="object-cover opacity-30"
        />
        {/* Gradient overlay — dark left, fade right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/85 to-[#0d0d0d]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24 lg:py-36 flex flex-col lg:flex-row items-end gap-16">

        {/* ── Left: editorial copy ──────────────────────────────── */}
        <div className="flex-1 max-w-2xl">
          {/* Small label */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-5"
          >
            ASTU Campus Library · Digital &amp; Physical
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-serif font-black text-white leading-[1.03] tracking-tight mb-6"
          >
            {t("hero.title_part1") as string}{" "}
            <em className="not-italic text-[#f5c518]">
              {t("hero.title_italic") as string}
            </em>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-base text-white/60 leading-relaxed mb-10 max-w-xl"
          >
            {t("hero.description") as string}
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-3"
          >
            <Link
              href="/books"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#f5c518] px-8 py-3.5 text-sm font-black text-[#0d0d0d] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(245,197,24,0.38)] active:translate-y-0"
            >
              {t("hero.cta") as string}
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/create-account"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white border border-white/20 hover:bg-white/08 hover:border-white/35 transition-all"
            >
              Create free account
            </Link>
          </motion.div>
        </div>

        {/* ── Right: real book covers strip ────────────────────── */}
        {recentBooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex items-end gap-3 shrink-0"
          >
            {recentBooks.map((book, i) => {
              const heights = ["h-52", "h-64", "h-72", "h-60"];
              const rotations = ["-rotate-3", "rotate-1", "-rotate-1", "rotate-2"];
              return (
                <Link key={book.id} href={`/books/${book.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }}
                    className={`relative w-[100px] ${heights[i]} rounded-xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] cursor-pointer ${rotations[i]} transition-all duration-300`}
                    style={{ zIndex: i }}
                  >
                    <Image
                      src={
                        (book as unknown as { cover_image_url?: string }).cover_image_url ||
                        "/reading_illustration.png"
                      }
                      alt={book.title}
                      fill
                      className="object-cover"
                    />
                    {/* Bottom fade with title */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <p className="text-[9px] text-white font-bold leading-tight line-clamp-2">
                        {book.title}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
};
