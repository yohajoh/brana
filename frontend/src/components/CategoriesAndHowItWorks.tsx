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

const PILL_PALETTE = [
  { bg: "bg-white",          text: "text-[#0d0d0d]",  glow: "hover:shadow-[0_4px_18px_rgba(255,255,255,0.2)]"   },
  { bg: "bg-[#f5c518]",      text: "text-[#0d0d0d]",  glow: "hover:shadow-[0_4px_18px_rgba(245,197,24,0.45)]"   },
  { bg: "bg-white/12",       text: "text-white",       glow: "hover:shadow-[0_4px_14px_rgba(255,255,255,0.12)]"  },
  { bg: "bg-[#f5c518]/20",   text: "text-[#f5c518]",  glow: "hover:shadow-[0_4px_12px_rgba(245,197,24,0.25)]"   },
  { bg: "bg-white/08",       text: "text-white/80",    glow: "hover:shadow-[0_4px_12px_rgba(255,255,255,0.08)]"  },
  { bg: "bg-[#f5c518]/10",   text: "text-[#f5c518]",  glow: "hover:shadow-[0_4px_12px_rgba(245,197,24,0.18)]"   },
];

const STEP_ACCENTS = [
  { hex: "#142b6f", badgeBg: "bg-[#142b6f]",  badgeText: "text-white",      activeCard: "from-[#142b6f]/06", labelColor: "text-[#142b6f]"  },
  { hex: "#c9930a", badgeBg: "bg-[#f5c518]",  badgeText: "text-[#0d0d0d]",  activeCard: "from-[#f5c518]/08", labelColor: "text-[#7a5c00]"  },
  { hex: "#142b6f", badgeBg: "bg-[#142b6f]",  badgeText: "text-white",      activeCard: "from-[#142b6f]/06", labelColor: "text-[#142b6f]"  },
  { hex: "#0d0d0d", badgeBg: "bg-[#0d0d0d]",  badgeText: "text-white",      activeCard: "from-[#0d0d0d]/05", labelColor: "text-[#374151]"  },
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
    <section className="relative w-full overflow-hidden">

      {/* ─────────────────────────────────────────────────────
          BACKGROUND — rich warm charcoal with amber/gold glow
          Strong, premium, not blue
      ───────────────────────────────────────────────────── */}

      {/* Base: deep warm charcoal — editorial, not cold */}
      <div className="absolute inset-0 bg-[#18180f]" />

      {/* Warm amber radial at top-right — the dominant colour */}
      <div className="absolute -top-32 -right-32 w-[640px] h-[640px] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, rgba(245,197,24,0.18) 0%, rgba(200,140,20,0.10) 50%, transparent 70%)" }} />

      {/* Warm sienna/terracotta at bottom-left — second accent */}
      <div className="absolute -bottom-28 -left-28 w-[520px] h-[520px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(210,120,50,0.14) 0%, rgba(180,90,30,0.08) 55%, transparent 75%)" }} />

      {/* Centre warm glow lifts the mid-section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(ellipse, rgba(245,197,24,0.06) 0%, transparent 70%)" }} />

      {/* Ultra-fine cross-hatch texture — barely visible on dark */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(245,197,24,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ─────────────────────────────────────────────────────
          CONTENT
      ───────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20">

        {/* ═══════════════════════════════════════════════════
            TOP: CATEGORIES — full width
        ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
                {t("categories_strip.eyebrow") as string}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
                {t("categories_strip.title") as string}
              </h2>
            </div>
            <Link
              href="/books"
              className="group inline-flex items-center gap-2 text-sm font-bold text-white/55 hover:text-white transition-colors self-start sm:self-end"
            >
              {t("categories_strip.browse_all") as string}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-1 transition-transform">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Pills */}
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
              variants={{ visible: { transition: { staggerChildren: 0.045 } }, hidden: {} }}
              className="flex flex-wrap gap-2.5"
            >
              {categories.map((cat, i) => {
                const { bg, text, glow } = PILL_PALETTE[i % PILL_PALETTE.length];
                return (
                  <motion.div
                    key={cat.id}
                    variants={{
                      hidden:  { opacity: 0, scale: 0.82, y: 12 },
                      visible: { opacity: 1, scale: 1,    y: 0,
                        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                    }}
                  >
                    <Link
                      href={`/books?category_id=${cat.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold
                                  transition-all duration-200 hover:-translate-y-0.5 ${bg} ${text} ${glow}`}
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
        </motion.div>

        {/* Thin divider — tighter spacing */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* ═══════════════════════════════════════════════════
            BOTTOM: HOW IT WORKS
            Left: accordion step list  |  Right: detail card
        ═══════════════════════════════════════════════════ */}
        <div>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9"
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
                {t("how_it_works.eyebrow") as string}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
                {t("how_it_works.title") as string}
              </h2>
            </div>
            <p className="text-sm text-white/45 max-w-xs leading-relaxed">
              {t("how_it_works.subtitle") as string}
            </p>
          </motion.div>

          {/* Two-column layout: accordion left, detail card right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] gap-5 lg:gap-10">

            {/* ── LEFT: accordion step list ─────────────── */}
            <div className="flex flex-col gap-2">
              {steps.map((step, i) => {
                const isActive = activeStep === i;
                const accent = STEP_ACCENTS[i];
                return (
                  <motion.button
                    key={step.num}
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.44, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setActiveStep(i)}
                    className={`group w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                      isActive
                        ? "border-white/25 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
                        : "border-white/08 bg-white/06 hover:bg-white/12 hover:border-white/15"
                    }`}
                  >
                    {/* Always-visible row */}
                    <div className="flex items-center gap-3.5 px-4 py-4">
                      {/* Badge */}
                      <div className={`relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 ${
                        isActive
                          ? `${accent.badgeBg} ${accent.badgeText} shadow-[0_4px_14px_rgba(0,0,0,0.3)]`
                          : "bg-white/10 text-white/40"
                      }`}>
                        {step.num}
                        {isActive && (
                          <motion.span
                            layoutId="accordion-dot"
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f5c518] border-2 border-white"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-0.5 transition-colors ${
                          isActive ? accent.labelColor : "text-white/30"
                        }`}>
                          {step.label}
                        </span>
                        <span className={`block text-sm font-bold leading-snug transition-colors ${
                          isActive ? "text-[#0d0d0d]" : "text-white/55"
                        }`}>
                          {step.title}
                        </span>
                      </div>

                      {isActive ? (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                          className="h-1 w-8 rounded-full origin-left shrink-0"
                          style={{ background: accent.hex }}
                        />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                          className="text-white/25 group-hover:text-white/60 transition-colors shrink-0">
                          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Mobile-only inline expand */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          key="mob-detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:hidden overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <div className="h-px bg-white/15 mb-3" />
                            <p className="text-sm text-[#374151] leading-relaxed mb-1">
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

              {/* Progress dots */}
              <div className="flex items-center gap-2 pt-3 pl-1">
                {steps.map((_, i) => (
                  <button key={i} onClick={() => setActiveStep(i)}>
                    <motion.div
                      animate={{ width: i === activeStep ? 22 : 7, opacity: i === activeStep ? 1 : 0.25 }}
                      transition={{ duration: 0.28 }}
                      className="h-1.5 rounded-full bg-[#f5c518]"
                    />
                  </button>
                ))}
                <span className="ml-auto text-[11px] font-bold text-white/35">
                  {steps[activeStep].num} / {String(steps.length).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* ── RIGHT: big detail card — desktop only ──── */}
            <div className="hidden lg:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 28, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -14, scale: 0.97 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                >
                  {(() => {
                    const step = steps[activeStep];
                    const accent = STEP_ACCENTS[activeStep];
                    return (
                      /* Card with 50% transparent frosted glass look */
                      <div
                        className="h-full min-h-[340px] rounded-3xl overflow-hidden flex flex-col
                                   border border-white/80
                                   shadow-[0_8px_40px_rgba(20,43,111,0.10)]"
                        style={{
                          background: "rgba(255,255,255,0.65)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                        }}
                      >
                        {/* Coloured top stripe */}
                        <div className="h-1.5 w-full shrink-0" style={{ background: accent.hex }} />

                        {/* Inner gradient tint matching step colour */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${accent.activeCard} to-transparent pointer-events-none rounded-3xl`}
                        />

                        <div className="relative flex-1 p-8 lg:p-10 flex flex-col">
                          {/* Meta row */}
                          <div className="flex items-start justify-between mb-6">
                            <div>
                              <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${accent.labelColor} opacity-70`}>
                                {t("how_it_works.step_label") as string} {step.num} · {step.label}
                              </p>
                              <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] leading-tight max-w-xs">
                                {step.title}
                              </h3>
                            </div>
                            {/* Ghost number */}
                            <span
                              className="text-8xl font-serif font-black select-none leading-none -mt-3 -mr-1"
                              style={{ color: `${accent.hex}12` }}
                            >
                              {step.num}
                            </span>
                          </div>

                          {/* Body */}
                          <div className="flex-1 space-y-3 mb-8">
                            <p className="text-base text-[#374151] leading-relaxed">
                              {step.description}
                            </p>
                            <p className="text-sm text-[#6b7280] leading-relaxed">
                              {step.detail}
                            </p>
                          </div>

                          {/* Step dots navigation */}
                          <div className="flex items-center gap-2">
                            {steps.map((_, i) => (
                              <button key={i} onClick={() => setActiveStep(i)}>
                                <motion.div
                                  animate={{
                                    width:   i === activeStep ? 26 : 8,
                                    opacity: i === activeStep ? 1  : 0.22,
                                  }}
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  className="h-2 rounded-full"
                                  style={{ background: accent.hex }}
                                />
                              </button>
                            ))}
                            <span className="ml-auto text-xs font-bold text-[#9ca3af]">
                              {activeStep + 1} / {steps.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
