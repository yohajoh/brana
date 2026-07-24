"use client";

import React from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion } from "framer-motion";

export const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      num: "01",
      title: t("how_it_works.steps.create_account.title") as string,
      description: t("how_it_works.steps.create_account.description") as string,
    },
    {
      num: "02",
      title: t("how_it_works.steps.choose_book.title") as string,
      description: t("how_it_works.steps.choose_book.description") as string,
    },
    {
      num: "03",
      title: t("how_it_works.steps.dorm_delivery.title") as string,
      description: t("how_it_works.steps.dorm_delivery.description") as string,
    },
    {
      num: "04",
      title: t("how_it_works.steps.return_pay.title") as string,
      description: t("how_it_works.steps.return_pay.description") as string,
    },
  ];

  return (
    <section className="w-full bg-[#0d0d0d] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-white max-w-lg leading-tight">
            {t("how_it_works.title") as string}
          </h2>
        </motion.div>

        {/* Steps — horizontal editorial layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/06">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0d0d0d] p-8 group"
            >
              {/* Step number — very large, muted */}
              <div className="text-6xl font-serif font-black text-white/06 leading-none mb-6 select-none">
                {step.num}
              </div>
              {/* Yellow accent bar */}
              <div className="w-8 h-0.5 bg-[#f5c518] mb-5 group-hover:w-14 transition-all duration-300" />
              <h3 className="text-lg font-serif font-black text-white mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
