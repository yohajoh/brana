"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

export const FAQ = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  type FaqItem = { question: string; answer: string };
  const faqs = (t("faq.questions") as FaqItem[]) || [];

  return (
    <section className="w-full bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-16 lg:gap-24">

          {/* Left: sticky label column */}
          <div className="lg:pt-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:sticky lg:top-24"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-3">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight mb-5">
                {t("faq.title") as string}
              </h2>
              <p className="text-sm text-[#374151] leading-relaxed mb-8">
                Got more questions? Reach out to the library team.
              </p>
              <a
                href="mailto:hello@birana.com"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#142b6f] border-b border-[#142b6f]/30 pb-0.5 hover:border-[#142b6f] transition-colors"
              >
                Contact us
              </a>
            </motion.div>
          </div>

          {/* Right: accordion */}
          <div className="divide-y divide-[#e2e0e7]">
            {faqs.map((faq: FaqItem, index: number) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-6 py-5 text-left group"
                  >
                    <span className={`text-sm font-bold transition-colors ${isOpen ? "text-[#142b6f]" : "text-[#0d0d0d] group-hover:text-[#142b6f]"}`}>
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                        isOpen
                          ? "bg-[#142b6f] border-[#142b6f] text-white"
                          : "border-[#e2e0e7] text-[#374151] group-hover:border-[#142b6f] group-hover:text-[#142b6f]"
                      }`}
                    >
                      {isOpen ? <Minus size={13} /> : <Plus size={13} />}
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-[#374151] leading-relaxed pb-5 pr-12">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
