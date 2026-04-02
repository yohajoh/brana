"use client";

import React, { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { useLanguage } from "@/components/providers/LanguageProvider";

export const FAQ = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(3); // Set Birana question open by default

  type FaqItem = { question: string; answer: string };
  const faqs = (t("faq.questions") as FaqItem[]) || [];

  return (
    <section className="w-full py-24 bg-card/10 mb-15">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeader title={t("faq.title")} centered />

        <div className="space-y-4">
          {faqs.map((faq: FaqItem, index: number) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`group rounded-3xl border transition-all duration-300 ${
                  isOpen
                    ? "bg-card border-primary ring-1 ring-primary/20 shadow-lg"
                    : "bg-background border-border hover:border-secondary shadow-sm"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl transition-colors ${isOpen ? "bg-primary text-background" : "bg-muted text-secondary"}`}
                    >
                      <HelpCircle size={20} />
                    </div>
                    <span
                      className={`text-lg font-serif font-bold transition-colors ${isOpen ? "text-primary" : "text-secondary group-hover:text-primary"}`}
                    >
                      {faq.question}
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-full transition-all duration-300 ${isOpen ? "bg-primary text-background rotate-180" : "bg-muted text-secondary"}`}
                  >
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 pb-8 pt-2 pl-16 text-secondary/80 font-medium leading-relaxed">
                    <div className="h-[2px] w-12 bg-border mb-4" />
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
