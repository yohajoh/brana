"use client";

import React from "react";
import { UserPlus, Search, Truck, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      id: 1,
      title: t("how_it_works.steps.create_account.title"),
      description: t("how_it_works.steps.create_account.description"),
      icon: <UserPlus size={24} />,
    },
    {
      id: 2,
      title: t("how_it_works.steps.choose_book.title"),
      description: t("how_it_works.steps.choose_book.description"),
      icon: <Search size={24} />,
    },
    {
      id: 3,
      title: t("how_it_works.steps.dorm_delivery.title"),
      description: t("how_it_works.steps.dorm_delivery.description"),
      icon: <Truck size={24} />,
    },
    {
      id: 4,
      title: t("how_it_works.steps.return_pay.title"),
      description: t("how_it_works.steps.return_pay.description"),
      icon: <RotateCcw size={24} />,
    },
  ];

  return (
    <section className="w-full py-24 bg-background mb-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-extrabold text-primary mb-4">
            {t("how_it_works.title")}
          </h2>
          <div className="h-1.5 w-24 bg-secondary/30 mx-auto rounded-full" />
        </div>

        <div className="relative">
          {/* Decorative curve (simplified for implementation) */}
          <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[2px] border-t-2 border-dashed border-border/80 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex flex-col items-center text-center p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-background mb-6 shadow-lg shadow-primary/20">
                  {step.icon}
                </div>
                <h3 className="text-xl font-serif font-bold text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-secondary leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
