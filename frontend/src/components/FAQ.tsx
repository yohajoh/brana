"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

export const FAQ = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  type FaqItem = { question: string; answer: string };
  const faqs = (t("faq.questions") as FaqItem[]) || [];

  return (
    /*
     * overflow: clip instead of overflow: hidden — clip does NOT create a new
     * stacking context, so `position: sticky` on the child still works while
     * the decorative blobs are still clipped to the section boundaries.
     */
    <section className="relative w-full" style={{ overflow: "clip" }}>

      {/* ── Background ───────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[#f8f7fc] -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-[380px] h-[380px] rounded-full bg-[#f5c518]/08 blur-[90px]"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute -bottom-24 -left-16 w-[340px] h-[340px] rounded-full bg-[#142b6f]/08 blur-[90px]"
        />
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #142b6f 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20">

        {/*
         * Two-column grid: left is sticky, right scrolls naturally.
         * Key: `lg:items-start` prevents the grid from stretching children
         * to equal height, which would prevent sticky from working.
         */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20 lg:items-start">

          {/* ── LEFT: sticky panel ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28"
          >
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/40 bg-[#f5c518]/10 px-3.5 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#92700c]">FAQ</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight mb-4">
              {t("faq.title") as string}
            </h2>

            <p className="text-sm text-[#6b7280] leading-relaxed mb-8">
              {t("faq.contact_prompt") as string}
            </p>

            {/* Contact card */}
            <div className="rounded-2xl border border-[#e2e0e7] bg-white p-5 shadow-[0_2px_16px_rgba(20,43,111,0.07)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af] mb-3">
                {t("faq.contact_us") as string}
              </p>
              <div className="space-y-2 mb-4">
                <a href="mailto:hello@birana.com"
                   className="block text-sm text-[#374151] hover:text-[#142b6f] transition-colors">
                  hello@birana.com
                </a>
                <a href="tel:+251987654321"
                   className="block text-sm text-[#374151] hover:text-[#142b6f] transition-colors">
                  +251 987 654 321
                </a>
              </div>
              <a
                href="mailto:hello@birana.com"
                className="inline-flex items-center gap-2 rounded-full bg-[#142b6f] px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(20,43,111,0.28)] transition-all"
              >
                {t("faq.contact_us") as string}
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Question count */}
            {faqs.length > 0 && (
              <div className="mt-5 flex items-center gap-2 text-xs text-[#9ca3af] font-semibold">
                <span className="w-5 h-5 rounded-full bg-[#142b6f] flex items-center justify-center text-[9px] font-black text-white shrink-0">
                  {faqs.length}
                </span>
                <span>{faqs.length} {t("faq.questions_label") as string}</span>
              </div>
            )}
          </motion.div>

          {/* ── RIGHT: accordion list ───────────────────────────── */}
          <div className="flex flex-col gap-3">
            {faqs.map((faq: FaqItem, index: number) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10px" }}
                  transition={{ duration: 0.42, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? "border-[#142b6f]/18 bg-white shadow-[0_4px_24px_rgba(20,43,111,0.09)]"
                      : "border-[#e2e0e7] bg-white/70 hover:bg-white hover:border-[#142b6f]/15 hover:shadow-[0_2px_12px_rgba(20,43,111,0.05)]"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-[18px] text-left group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`shrink-0 mt-0.5 text-xs font-black tabular-nums transition-colors ${
                        isOpen ? "text-[#142b6f]" : "text-[#d1d0d7] group-hover:text-[#142b6f]/40"
                      }`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`text-sm font-bold leading-snug transition-colors ${
                        isOpen ? "text-[#142b6f]" : "text-[#0d0d0d] group-hover:text-[#142b6f]"
                      }`}>
                        {faq.question}
                      </span>
                    </div>

                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isOpen
                          ? "bg-[#142b6f] text-white"
                          : "bg-[#f1f0f4] text-[#6b7280] group-hover:bg-[#142b6f]/08 group-hover:text-[#142b6f]"
                      }`}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5">
                          <div className="flex gap-4">
                            <div className="w-0.5 rounded-full bg-[#142b6f]/18 shrink-0" />
                            <p className="text-sm text-[#4b5563] leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {/* Bottom breathing room */}
            <div className="h-2" />
          </div>

        </div>
      </div>
    </section>
  );
};
