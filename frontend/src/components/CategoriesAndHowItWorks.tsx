"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

type Category = {
  id: string;
  name: string;
  slug: string;
  _count?: { books?: number };
};

/* Category pill palette — works on white background */
const PALETTE = [
  { bg: "bg-[#142b6f]",      text: "text-white",      shadow: "hover:shadow-[0_4px_16px_rgba(20,43,111,0.3)]"  },
  { bg: "bg-[#f5c518]",      text: "text-[#0d0d0d]",  shadow: "hover:shadow-[0_4px_16px_rgba(245,197,24,0.4)]" },
  { bg: "bg-[#0d0d0d]",      text: "text-white",      shadow: "hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]"     },
  { bg: "bg-[#f1f0f4]",      text: "text-[#374151]",  shadow: "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"     },
  { bg: "bg-[#142b6f]/08",   text: "text-[#142b6f]",  shadow: "hover:shadow-[0_4px_12px_rgba(20,43,111,0.15)]" },
  { bg: "bg-[#f5c518]/15",   text: "text-[#7a5c00]",  shadow: "hover:shadow-[0_4px_12px_rgba(245,197,24,0.2)]" },
];

/* Step accent colours */
const STEP_ACCENTS = [
  { hex: "#142b6f", light: "bg-[#142b6f]/08", text: "text-[#142b6f]", badge: "bg-[#142b6f] text-white" },
  { hex: "#d4a800", light: "bg-[#f5c518]/15", text: "text-[#7a5c00]", badge: "bg-[#f5c518] text-[#0d0d0d]" },
  { hex: "#142b6f", light: "bg-[#142b6f]/08", text: "text-[#142b6f]", badge: "bg-[#142b6f] text-white" },
  { hex: "#0d0d0d", light: "bg-[#0d0d0d]/06", text: "text-[#0d0d0d]", badge: "bg-[#0d0d0d] text-white" },
];

export const CategoriesAndHowItWorks = () => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: () => fetchApi("/categories?limit=12"),
    staleTime: 10 * 60 * 1000,
  });
  const categories: Category[] = (catData as { categories?: Category[] })?.categories ?? [];

  const steps = [
    {
      num: "01",
      label: t("how_it_works.steps.create_account.label") as string,
      title: t("how_it_works.steps.create_account.title") as string,
      description: t("how_it_works.steps.create_account.description") as string,
      detail: t("how_it_works.steps.create_account.detail") as string,
    },
    {
      num: "02",
      label: t("how_it_works.steps.choose_book.label") as string,
      title: t("how_it_works.steps.choose_book.title") as string,
      description: t("how_it_works.steps.choose_book.description") as string,
      detail: t("how_it_works.steps.choose_book.detail") as string,
    },
    {
      num: "03",
      label: t("how_it_works.steps.dorm_delivery.label") as string,
      title: t("how_it_works.steps.dorm_delivery.title") as string,
      description: t("how_it_works.steps.dorm_delivery.description") as string,
      detail: t("how_it_works.steps.dorm_delivery.detail") as string,
    },
    {
      num: "04",
      label: t("how_it_works.steps.return_pay.label") as string,
      title: t("how_it_works.steps.return_pay.title") as string,
      description: t("how_it_works.steps.return_pay.description") as string,
      detail: t("how_it_works.steps.return_pay.detail") as string,
    },
  ];

  return (
    /* ── White base with a barely-visible warm paper texture ── */
    <section className="relative w-full overflow-hidden bg-white">

      {/* Very subtle background: diagonal lines + two soft blurs */}
      <div className="pointer-events-none absolute inset-0">
        {/* Warm offwhite noise */}
        <div className="absolute inset-0 bg-[#faf9f7]" />
        {/* Soft gold glow top-right */}
        <div className="absolute -top-32 right-0 w-[480px] h-[480px] rounded-full bg-[#f5c518]/06 blur-[100px]" />
        {/* Soft navy glow bottom-left */}
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#142b6f]/05 blur-[90px]" />
        {/* Ultra-faint diagonal rule */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, #142b6f 0, #142b6f 1px, transparent 0, transparent 50%)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">

        {/* ═══════════════════════════════════════════════════════
            FULL-WIDTH LAYOUT: Left panel + Right panel side-by-side
            (stacked on mobile, side-by-side from lg)
        ═══════════════════════════════════════════════════════ */}
        <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:divide-x lg:divide-[#e2e0e7]/70 min-h-[600px]">

          {/* ────────────────────────────────────────────────────
              LEFT PANEL — Categories (Find Your Next Read)
          ──────────────────────────────────────────────────── */}
          <div className="py-16 lg:py-20 lg:pr-12 flex flex-col justify-between">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
                {t("categories_strip.eyebrow") as string}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight mb-3">
                {t("categories_strip.title") as string}
              </h2>
              <p className="text-sm text-[#6b7280] leading-relaxed max-w-xs">
                {t("how_it_works.subtitle") as string}
              </p>
            </motion.div>

            {/* Category pill cloud */}
            <div className="flex-1">
              {catsLoading ? (
                <div className="flex flex-wrap gap-2.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton h-9 w-24 rounded-full" />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } },
                    hidden: {},
                  }}
                  className="flex flex-wrap gap-2.5"
                >
                  {categories.map((cat, i) => {
                    const { bg, text, shadow } = PALETTE[i % PALETTE.length];
                    return (
                      <motion.div
                        key={cat.id}
                        variants={{
                          hidden:  { opacity: 0, scale: 0.85, y: 10 },
                          visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
                        }}
                      >
                        <Link
                          href={`/books?category_id=${cat.id}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold
                                      transition-all duration-200 hover:-translate-y-0.5 ${shadow} ${bg} ${text}`}
                        >
                          {cat.name}
                          {cat._count?.books !== undefined && (
                            <span className="opacity-50 text-xs">{cat._count.books}</span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Browse all link */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8 pt-6 border-t border-[#e2e0e7]/70"
            >
              <Link
                href="/books"
                className="group inline-flex items-center gap-2 text-sm font-bold text-[#142b6f] hover:text-[#0d0d0d] transition-colors"
              >
                {t("categories_strip.browse_all") as string}
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className="group-hover:translate-x-1.5 transition-transform"
                >
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          </div>

          {/* ────────────────────────────────────────────────────
              RIGHT PANEL — How It Works (interactive)
          ──────────────────────────────────────────────────── */}
          <div className="py-16 lg:py-20 lg:pl-12 border-t border-[#e2e0e7]/70 lg:border-t-0 flex flex-col">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
                {t("how_it_works.eyebrow") as string}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight">
                {t("how_it_works.title") as string}
              </h2>
            </motion.div>

            {/* Step list — with live expanding detail */}
            <div className="flex flex-col gap-1.5 flex-1">
              {steps.map((step, i) => {
                const isActive = activeStep === i;
                const accent = STEP_ACCENTS[i];
                return (
                  <motion.button
                    key={step.num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setActiveStep(i)}
                    className={`group w-full text-left rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive
                        ? `${accent.light} ring-1 ring-[#e2e0e7] shadow-[0_2px_12px_rgba(20,43,111,0.08)]`
                        : "hover:bg-[#f8f7fb]"
                    }`}
                  >
                    {/* Always-visible row */}
                    <div className="flex items-center gap-3.5 px-4 py-3.5">
                      {/* Step badge */}
                      <div className={`relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
                        isActive ? accent.badge : "bg-[#f1f0f4] text-[#9ca3af]"
                      }`}>
                        {step.num}
                        {isActive && (
                          <motion.span
                            layoutId="step-dot-light"
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f5c518] border-2 border-white"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-0.5 transition-colors ${
                          isActive ? accent.text : "text-[#9ca3af]"
                        }`}>
                          {step.label}
                        </span>
                        <span className={`block text-sm font-bold leading-snug transition-colors ${
                          isActive ? "text-[#0d0d0d]" : "text-[#374151]"
                        }`}>
                          {step.title}
                        </span>
                      </div>

                      {/* Animated progress bar on active */}
                      {isActive ? (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="h-1 w-10 rounded-full origin-left"
                          style={{ background: accent.hex }}
                        />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#d1d0d7] group-hover:text-[#142b6f] transition-colors shrink-0">
                          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Expandable detail panel */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0">
                            <div className="h-px bg-[#e2e0e7]/60 mb-3" />
                            <p className="text-sm text-[#374151] leading-relaxed mb-1.5">
                              {step.description}
                            </p>
                            <p className="text-xs text-[#6b7280] leading-relaxed">
                              {step.detail}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>

            {/* Step counter indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-5 border-t border-[#e2e0e7]/70 flex items-center justify-between"
            >
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className="transition-all duration-300"
                  >
                    <motion.div
                      animate={{
                        width: i === activeStep ? 24 : 8,
                        opacity: i === activeStep ? 1 : 0.25,
                      }}
                      className="h-1.5 rounded-full bg-[#142b6f]"
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-[#9ca3af]">
                {t("how_it_works.step_label") as string} {steps[activeStep].num} / {steps.length.toString().padStart(2, "0")}
              </span>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
