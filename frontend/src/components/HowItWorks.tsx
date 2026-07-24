"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

export const HowItWorks = () => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

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

  const accentColors = [
    { bg: "bg-[#142b6f]", text: "text-white",     ring: "ring-[#142b6f]/20" },
    { bg: "bg-[#f5c518]", text: "text-[#0d0d0d]", ring: "ring-[#f5c518]/30" },
    { bg: "bg-[#142b6f]", text: "text-white",     ring: "ring-[#142b6f]/20" },
    { bg: "bg-[#0d0d0d]", text: "text-white",     ring: "ring-[#0d0d0d]/15" },
  ];

  return (
    <section className="w-full bg-[#f8f7fb] py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14"
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
              {t("how_it_works.eyebrow") as string}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight">
              {t("how_it_works.title") as string}
            </h2>
          </div>
          <p className="text-sm text-[#6b7280] max-w-xs leading-relaxed">
            {t("how_it_works.subtitle") as string}
          </p>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12">

          {/* LEFT: step tabs */}
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              const color = accentColors[i];
              return (
                <motion.button
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setActiveStep(i)}
                  className={`group relative w-full text-left rounded-2xl p-5 border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-white border-[#142b6f]/12 shadow-[0_4px_24px_rgba(20,43,111,0.10)]"
                      : "bg-white/50 border-[#e2e0e7]/60 hover:bg-white hover:border-[#e2e0e7] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Badge */}
                    <div className={`relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-4 transition-all duration-300 ${
                      isActive ? `${color.bg} ${color.text} ${color.ring}` : "bg-[#f1f0f4] text-[#9ca3af] ring-transparent"
                    }`}>
                      <span className="text-sm font-black">{step.num}</span>
                      {isActive && (
                        <motion.span
                          layoutId="step-dot"
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#f5c518] border-2 border-white"
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-black uppercase tracking-wider transition-colors ${isActive ? "text-[#142b6f]" : "text-[#9ca3af]"}`}>
                          {step.label}
                        </span>
                        {isActive && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="h-0.5 w-10 bg-[#f5c518] rounded-full origin-left"
                          />
                        )}
                      </div>
                      <p className={`text-sm font-bold mt-0.5 transition-colors leading-snug ${isActive ? "text-[#0d0d0d]" : "text-[#374151]"}`}>
                        {step.title}
                      </p>
                    </div>

                    {/* Chevron */}
                    <motion.svg
                      animate={{ x: isActive ? 2 : 0, opacity: isActive ? 1 : 0.3 }}
                      width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0"
                    >
                      <path d="M6 4l4 4-4 4" stroke={isActive ? "#142b6f" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  </div>

                  {/* Mobile inline detail */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="lg:hidden overflow-hidden text-sm text-[#374151] leading-relaxed mt-3 pt-3 border-t border-[#e2e0e7]/60"
                      >
                        {step.detail}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* RIGHT: detail panel — desktop only */}
          <div className="hidden lg:block">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                {(() => {
                  const step = steps[activeStep];
                  const color = accentColors[activeStep];
                  return (
                    <div className="h-full rounded-3xl border border-[#e2e0e7] bg-white shadow-[0_4px_24px_rgba(20,43,111,0.07)] overflow-hidden flex flex-col">
                      <div className={`h-2 w-full ${color.bg}`} />
                      <div className="flex-1 p-10 flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <p className={`text-[11px] font-black uppercase tracking-[0.22em] mb-2 ${activeStep === 1 ? "text-[#d4a800]" : "text-[#142b6f]/50"}`}>
                              {t("how_it_works.step_label") as string} {step.num} · {step.label}
                            </p>
                            <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] leading-tight max-w-xs">
                              {step.title}
                            </h3>
                          </div>
                          <span className="text-7xl font-serif font-black text-[#0d0d0d]/04 select-none leading-none -mt-2">
                            {step.num}
                          </span>
                        </div>

                        <div className="space-y-4 flex-1">
                          <p className="text-base text-[#374151] leading-relaxed">{step.description}</p>
                          <p className="text-sm text-[#6b7280] leading-relaxed">{step.detail}</p>
                        </div>

                        <div className="mt-10 flex items-center gap-2">
                          {steps.map((_, i) => (
                            <button key={i} onClick={() => setActiveStep(i)} className="transition-all duration-300">
                              <motion.div
                                animate={{ width: i === activeStep ? 24 : 8, opacity: i === activeStep ? 1 : 0.3 }}
                                className={`h-2 rounded-full ${color.bg}`}
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
    </section>
  );
};
