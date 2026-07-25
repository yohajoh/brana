"use client";

import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Heart, Users } from "lucide-react";

type PublicStats = { data: { totalBooks: number; totalStudents: number; totalRentals: number; totalCategories: number } };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

export default function AboutPage() {
  const { t } = useLanguage();

  const { data: statsData } = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => fetchApi("/public/stats"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const s = statsData?.data;

  const stats = [
    { value: s?.totalBooks    ? `${s.totalBooks.toLocaleString()}+`    : "200+", label: t("about_page.stats.books")    as string },
    { value: s?.totalRentals  ? `${s.totalRentals.toLocaleString()}+`  : "87+",  label: t("about_page.stats.borrowed") as string },
    { value: s?.totalStudents ? `${s.totalStudents.toLocaleString()}+` : "50+",  label: t("about_page.stats.readers")  as string },
    { value: s?.totalCategories ? `${s.totalCategories}`               : "12",   label: t("about_page.stats.members")  as string },
  ];

  const involvement = [
    {
      icon: BookOpen,
      title:       t("about_page.involvement.borrow.title")       as string,
      description: t("about_page.involvement.borrow.description") as string,
      cta:         t("about_page.involvement.cta_explore")         as string,
      href: "/books",
    },
    {
      icon: Heart,
      title:       t("about_page.involvement.donate.title")       as string,
      description: t("about_page.involvement.donate.description") as string,
      cta:         t("about_page.involvement.cta_contact")         as string,
      href: "#",
    },
    {
      icon: Users,
      title:       t("about_page.involvement.volunteer.title")       as string,
      description: t("about_page.involvement.volunteer.description") as string,
      cta:         t("about_page.involvement.cta_contact")            as string,
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0d0d0d]" style={{ minHeight: "70vh" }}>
        <div className="absolute inset-0">
          <Image src="/about img.jpg" alt="" fill className="object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/95 via-[#0d0d0d]/70 to-[#0d0d0d]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/80 via-transparent to-transparent" />
        </div>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f5c518]/70 via-[#f5c518] to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 flex flex-col justify-end pb-12 sm:pb-16 pt-20 sm:pt-24" style={{ minHeight: "70vh" }}>
          <motion.p {...fadeUp(0)} className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-3">
            {t("about_page.involvement.hero_eyebrow") as string}
          </motion.p>
          <motion.h1 {...fadeUp(0.08)}
            className="text-4xl sm:text-5xl lg:text-7xl font-serif font-black text-white leading-[1.03] mb-5 max-w-3xl">
            {t("about_page.story.title") as string}
          </motion.h1>
          <motion.p {...fadeUp(0.16)} className="text-sm sm:text-base text-white/55 leading-relaxed max-w-xl mb-8">
            {t("about_page.story.p1") as string}
          </motion.p>
          <motion.div {...fadeUp(0.22)} className="flex flex-wrap gap-3">
            <Link href="/books"
              className="group inline-flex items-center gap-2 rounded-full bg-[#f5c518] px-6 py-3 sm:px-7 sm:py-3.5 text-sm font-black text-[#0d0d0d] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,197,24,0.38)] transition-all">
              {t("about_page.involvement.explore_btn") as string}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/auth/create-account"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 sm:px-7 sm:py-3.5 text-sm font-bold text-white hover:bg-white/08 hover:border-white/45 transition-all">
              {t("about_page.involvement.join_free_btn") as string}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <div className="w-full bg-[#f8f7fc] border-b border-[#e2e0e7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#e2e0e7]">
            {stats.map(({ value, label }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="px-4 sm:px-6 py-6 sm:py-8 text-center">
                <div className="text-2xl sm:text-3xl font-serif font-black text-[#0d0d0d] mb-1">{value}</div>
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STORY — mobile-stacked, desktop side-by-side ── */}
      <section className="py-16 sm:py-24 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">

            {/* Text */}
            <div className="order-2 lg:order-1">
              <motion.div {...fadeUp(0)}>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-3">
                  {t("about_page.involvement.story_section_eyebrow") as string}
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight mb-5">
                  {t("about_page.mission.title") as string}
                </h2>
                <div className="h-1 w-12 bg-[#f5c518] rounded-full mb-7" />
              </motion.div>
              <motion.div {...fadeUp(0.08)} className="space-y-4 text-sm text-[#374151] leading-relaxed">
                <p>{t("about_page.story.p1") as string}</p>
                <p>{t("about_page.story.p2") as string}</p>
                <p>{t("about_page.story.p3") as string}</p>
              </motion.div>
            </div>

            {/* Image — mobile: full width, desktop: right column */}
            <motion.div
              initial={{ opacity: 0, x: 0, y: 24 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="order-1 lg:order-2 relative"
            >
              {/* Decorative offset block — hidden on mobile to avoid overflow */}
              <div className="hidden lg:block absolute -top-4 -right-4 w-full h-full rounded-3xl bg-[#f5c518]/15 border border-[#f5c518]/20" />
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.12)] lg:shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                <Image src="/about img.jpg" alt="Library" width={700} height={500}
                  className="w-full object-cover aspect-[4/3]" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0d0d0d]/80 to-transparent p-4 sm:p-6">
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#f5c518] mb-1">ASTU Campus</p>
                  <p className="text-xs sm:text-sm text-white font-semibold">
                    {t("about_page.involvement.story_section_eyebrow") as string} — Gibi Gubae Library
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MISSION — dark ── */}
      <section className="relative py-16 sm:py-24 bg-[#0d0d0d] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#f5c518]/05 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(245,197,24,0.9) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <motion.div {...fadeUp(0)}>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-4">
              {t("about_page.involvement.mission_section_eyebrow") as string}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight mb-7">
              {t("about_page.mission.title") as string}
            </h2>
          </motion.div>
          <motion.p {...fadeUp(0.1)} className="text-sm sm:text-base text-white/55 leading-relaxed">
            {t("about_page.mission.description") as string}
          </motion.p>
        </div>
      </section>

      {/* ── GET INVOLVED ── */}
      <section className="py-16 sm:py-24 bg-[#f8f7fc]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-10 sm:mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-3">
              {t("about_page.involvement.get_involved_eyebrow") as string}
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0d0d0d] leading-tight">
              {t("about_page.involvement.title") as string}
            </h2>
            <div className="h-1 w-12 bg-[#f5c518] rounded-full mx-auto mt-4" />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            {involvement.map(({ icon: Icon, title, description, cta, href }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.1)}
                className="group bg-white rounded-2xl sm:rounded-3xl border border-[#e2e0e7] p-6 sm:p-8 flex flex-col hover:border-[#0d0d0d]/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#0d0d0d] flex items-center justify-center mb-5 sm:mb-6 shadow-[0_4px_14px_rgba(0,0,0,0.22)] group-hover:-translate-y-1 transition-transform">
                  <Icon size={20} className="text-[#f5c518]" />
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-black text-[#0d0d0d] mb-2 sm:mb-3">{title}</h3>
                <p className="text-sm text-[#374151] leading-relaxed flex-1 mb-5 sm:mb-6">{description}</p>
                <Link href={href}
                  className="group/btn inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-white hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] transition-all self-start">
                  {cta}
                  <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="rounded-2xl sm:rounded-3xl bg-[#0d0d0d] overflow-hidden relative">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#f5c518]/08 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(245,197,24,1) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
            </div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8 px-6 sm:px-10 py-10 sm:py-12">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f5c518] mb-2">
                  {t("about_page.involvement.final_cta_eyebrow") as string}
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-white leading-tight">
                  {t("about_page.involvement.final_cta_title") as string}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link href="/books"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5c518] px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-black text-[#0d0d0d] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,197,24,0.38)] transition-all">
                  <BookOpen size={14} />
                  {t("about_page.involvement.explore_btn") as string}
                </Link>
                <Link href="/auth/create-account"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold text-white hover:bg-white/08 hover:border-white/45 transition-all">
                  {t("about_page.involvement.create_account_btn") as string}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
