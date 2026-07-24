"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllText?: string;
  centered?: boolean;
  accent?: string;
  dark?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  viewAllHref,
  viewAllText = "View All",
  centered = false,
  accent,
  dark = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-10 ${centered ? "text-center" : "flex items-end justify-between"}`}
    >
      <div className={centered ? "" : "flex-1"}>
        {accent && (
          <p className={`text-[11px] font-black uppercase tracking-[0.22em] mb-2 ${dark ? "text-[#f5c518]" : "text-[#f5c518]"}`}>
            {accent}
          </p>
        )}
        <h2 className={`text-3xl sm:text-4xl font-serif font-black leading-tight ${dark ? "text-white" : "text-[#0d0d0d]"}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-2 text-sm max-w-lg ${dark ? "text-white/50" : "text-[#374151]"}`}>
            {subtitle}
          </p>
        )}
      </div>

      {viewAllHref && !centered && (
        <Link
          href={viewAllHref}
          className={`flex items-center gap-1.5 text-sm font-bold transition-colors group mb-1 shrink-0 ${
            dark ? "text-white/50 hover:text-white" : "text-[#374151] hover:text-[#0d0d0d]"
          }`}
        >
          {viewAllText}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-x-1 transition-transform">
            <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </motion.div>
  );
};
