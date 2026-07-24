"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";

export const CTA = () => {
  const { t } = useLanguage();

  // Fetch live system config for max loan days
  const { data: configData } = useQuery({
    queryKey: ["public-system-config"],
    queryFn: () => fetchApi("/system-config"),
    staleTime: 10 * 60 * 1000,
  });
  const config = (configData as { data?: { config?: { max_loan_days?: number; daily_fine?: number; max_books_per_user?: number } } })?.data?.config;

  const liveStats = [
    {
      value: config?.max_loan_days ? `${config.max_loan_days} days` : "14 days",
      label: "Max loan period",
    },
    {
      value: config?.max_books_per_user ? `${config.max_books_per_user} books` : "3 books",
      label: "Per student limit",
    },
    {
      value: config?.daily_fine !== undefined ? `${Number(config.daily_fine).toFixed(0)} ETB/day` : "Free",
      label: "Late fee",
    },
  ];

  return (
    <section className="w-full bg-[#f8f7fb] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Live config strip */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-px bg-[#e2e0e7] rounded-2xl overflow-hidden mb-12"
        >
          {liveStats.map(({ value, label }) => (
            <div key={label} className="flex-1 min-w-[120px] bg-white px-6 py-5">
              <div className="text-xl font-serif font-black text-[#142b6f]">{value}</div>
              <div className="text-xs text-[#374151] font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Main CTA block */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden"
        >
          {/* Left: dark editorial */}
          <div className="bg-[#0d0d0d] px-8 sm:px-12 py-14 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-4">
                Get Started
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight mb-5">
                {t("cta_section.title") as string}
              </h2>
              <p className="text-sm text-white/55 leading-relaxed mb-10 max-w-sm">
                {t("cta_section.description") as string}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/books"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#f5c518] px-7 py-3.5 text-sm font-black text-[#0d0d0d] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,197,24,0.35)]"
              >
                {t("cta_section.button") as string}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/auth/create-account"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white border border-white/20 hover:bg-white/08 hover:border-white/35 transition-all"
              >
                Sign up free
              </Link>
            </div>
          </div>

          {/* Right: image */}
          <div className="relative h-64 lg:h-auto">
            <Image
              src="/reading img 9.jpg"
              alt="Reading at the library"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
