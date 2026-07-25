"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  useMyRentals, useSystemConfig, useStudentOverview,
  useRecommendations, usePopularity,
  type Rental, type SystemConfig,
} from "@/lib/hooks/useQueries";
import { CurrentlyBorrowed }     from "@/components/CurrentlyBorrowed";
import { AmountOwed }            from "@/components/AmountOwed";
import { BorrowingHistoryTable } from "@/components/BorrowingHistoryTable";
import { useLanguage }  from "@/components/providers/LanguageProvider";
import { usePersona }   from "@/components/providers/PersonaProvider";

/* ── animation variants ─────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const staggerFast = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

/* ── shared pieces ──────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-3">
      {children}
    </p>
  );
}

function StatCard({
  label, value, hi = false, loading = false,
}: { label: string; value: string | number; hi?: boolean; loading?: boolean }) {
  return (
    <motion.div variants={fadeUp}
      className={`rounded-2xl border p-4 ${hi ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-[#e8e4dc]"}`}>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className={`h-7 w-8 rounded ${hi ? "bg-white/10" : "bg-[#f0eeea]"}`} />
          <div className={`h-2.5 w-20 rounded ${hi ? "bg-white/10" : "bg-[#f0eeea]"}`} />
        </div>
      ) : (
        <>
          <p className={`text-[26px] font-serif font-black leading-none ${hi ? "text-[#f5c518]" : "text-[#0d0d0d]"}`}>
            {value}
          </p>
          <p className={`text-[9px] font-bold uppercase tracking-wider mt-2 ${hi ? "text-white/40" : "text-[#0d0d0d]/40"}`}>
            {label}
          </p>
        </>
      )}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { t }    = useLanguage();
  const { user } = usePersona();

  const { data: rentalsData,          isLoading } = useMyRentals();
  const { data: configData }          = useSystemConfig();
  const { data: overviewData }        = useStudentOverview();
  const { data: recommendationsData } = useRecommendations();
  const { data: popularityData }      = usePopularity();

  const rentals: Rental[]         = (rentalsData?.rentals || []) as unknown as Rental[];
  const config: SystemConfig|null = configData?.data?.config as unknown as SystemConfig | null;

  const overview = useMemo(() => {
    const d = overviewData?.data as {
      stats?: { reservationCount?: number; unreadNotifications?: number; onTimeRate?: number; dueSoon?: number };
      topCategories?: { name: string; count: number }[];
    } | undefined;
    return {
      reservationCount:    d?.stats?.reservationCount    || 0,
      unreadNotifications: d?.stats?.unreadNotifications || 0,
      onTimeRate:          d?.stats?.onTimeRate           || 0,
      dueSoon:             d?.stats?.dueSoon              || 0,
      topCategories:       d?.topCategories              || [],
    };
  }, [overviewData]);

  const recs = useMemo(() => {
    const d = recommendationsData?.data as {
      physical?: { id: string; title: string; author?: { name: string }; available: number }[];
    };
    return d?.physical || [];
  }, [recommendationsData]);

  const pop = useMemo(() => {
    const d = popularityData?.data as {
      trending?: { book: { id: string; title: string; author?: { name: string } }; rentalCount: number }[];
      topRated?: { book: { id: string; title: string; author?: { name: string } }; avgRating: number }[];
    };
    return { trending: d?.trending || [], topRated: d?.topRated || [] };
  }, [popularityData]);

  const borrowed      = rentals.filter((r) => r.status === "BORROWED");
  const currentBook   = borrowed[0] ?? null;
  const recentHistory = rentals.filter((r) => r.status === "RETURNED" || r.status === "COMPLETED");

  const pendingFine      = rentals.filter((r) => r.status === "PENDING" && r.fine != null)
                             .reduce((s, r) => s + Number(r.fine), 0);
  const overdueEstimated = borrowed.filter((r) => r.isOverdue && r.daysOverdue != null)
                             .reduce((s, r) => s + (r.daysOverdue ?? 0) * Number(config?.daily_fine || 0), 0);
  const totalOwed = pendingFine + overdueEstimated;

  const hr = new Date().getHours();
  const greeting = hr < 12
    ? String(t("student_dashboard.good_morning"))
    : hr < 17
      ? String(t("student_dashboard.good_afternoon"))
      : String(t("student_dashboard.good_evening"));

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="show"
      className="px-4 py-6 sm:px-6 pr-4 sm:pr-6 space-y-7 max-w-[1100px]"
    >

      {/* ── Greeting ───────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <p className="text-[10px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">{greeting}</p>
        <h1 className="text-[26px] sm:text-[30px] font-serif font-black text-[#0d0d0d] leading-tight">
          {isLoading ? "…" : (user?.name?.split(" ")[0] ?? "Student")}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_dashboard.subtitle"))}</p>
      </motion.div>

      {/* ── Stats row ──────────────────────────────── */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={String(t("student_dashboard.snapshot.due_soon"))}     value={overview.dueSoon}             hi={overview.dueSoon > 0}             loading={isLoading} />
        <StatCard label={String(t("student_dashboard.snapshot.on_time_rate"))}  value={`${overview.onTimeRate}%`}                                           loading={isLoading} />
        <StatCard label={String(t("student_dashboard.snapshot.reservations"))}  value={overview.reservationCount}                                           loading={isLoading} />
        <StatCard label={String(t("student_dashboard.snapshot.unread_alerts"))} value={overview.unreadNotifications} hi={overview.unreadNotifications > 0} loading={isLoading} />
      </motion.div>

      {/* ── Active book + owed ─────────────────────── */}
      <motion.div variants={fadeUp}>
        <SectionLabel>{String(t("student_dashboard.currently_borrowed"))}</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <CurrentlyBorrowed rental={currentBook} dailyFine={config?.daily_fine ? Number(config.daily_fine) : undefined} loading={isLoading} />
          </div>
          <div className="lg:col-span-2">
            <AmountOwed rental={currentBook} totalOwed={totalOwed} config={config} loading={isLoading} />
          </div>
        </div>
      </motion.div>

      {/* ── Recent history ─────────────────────────── */}
      <motion.div variants={fadeUp}>
        <BorrowingHistoryTable rentals={recentHistory.slice(0, 4)} loading={isLoading} />
      </motion.div>

      {/* ── Recs + Categories ──────────────────────── */}
      <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <motion.div variants={fadeUp} className="md:col-span-3 space-y-2.5">
          <SectionLabel>{String(t("student_dashboard.recommendations.title"))}</SectionLabel>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-[#e8e4dc] animate-pulse" />)}</div>
          ) : recs.length === 0 ? (
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_dashboard.recommendations.none"))}</p>
          ) : (
            <motion.div variants={staggerFast} className="space-y-1.5">
              {recs.map((book) => (
                <motion.div key={book.id} variants={fadeUp}
                  className="flex items-center gap-3 bg-white rounded-xl border border-[#e8e4dc] px-4 py-3 hover:border-[#0d0d0d]/20 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-[#f5c518] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{book.title}</p>
                    <p className="text-[11px] text-[#0d0d0d]/40 truncate">{book.author?.name}</p>
                  </div>
                  <span className={`text-[10px] font-bold shrink-0 ${book.available > 0 ? "text-emerald-600" : "text-[#0d0d0d]/25"}`}>
                    {book.available > 0
                      ? String(t("student_dashboard.recommendations.available", { count: book.available }))
                      : String(t("student_dashboard.recommendations.unavailable"))}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="md:col-span-2 space-y-2.5">
          <SectionLabel>{String(t("student_dashboard.categories.title"))}</SectionLabel>
          {overview.topCategories.length === 0 ? (
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_dashboard.categories.none"))}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {overview.topCategories.map((c) => (
                <span key={c.name} className="px-3 py-1.5 bg-white border border-[#e8e4dc] rounded-full text-[12px] font-semibold text-[#0d0d0d] hover:border-[#0d0d0d]/30 transition-colors cursor-default">
                  {c.name} <span className="text-[#0d0d0d]/30 font-normal ml-0.5">{c.count}</span>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Trending + Top rated ───────────────────── */}
      <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-10">

        <motion.div variants={fadeUp} className="space-y-2.5">
          <SectionLabel>{String(t("student_dashboard.trending.title"))}</SectionLabel>
          {pop.trending.length === 0 ? (
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_dashboard.trending.none"))}</p>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden divide-y divide-[#e8e4dc]/70">
              {pop.trending.map((item, i) => (
                <div key={item.book.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf9f6] transition-colors">
                  <span className="text-[11px] font-black text-[#0d0d0d]/20 w-4 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{item.book.title}</p>
                    <p className="text-[11px] text-[#0d0d0d]/35 truncate">{item.book.author?.name}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#0d0d0d]/30 shrink-0">
                    {String(t("student_dashboard.trending.rentals", { count: item.rentalCount }))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-2.5">
          <SectionLabel>{String(t("student_dashboard.top_rated.title"))}</SectionLabel>
          {pop.topRated.length === 0 ? (
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_dashboard.top_rated.none"))}</p>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden divide-y divide-[#e8e4dc]/70">
              {pop.topRated.map((item, i) => (
                <div key={item.book.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf9f6] transition-colors">
                  <span className="text-[11px] font-black text-[#0d0d0d]/20 w-4 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{item.book.title}</p>
                    <p className="text-[11px] text-[#0d0d0d]/35 truncate">{item.book.author?.name}</p>
                  </div>
                  <span className="text-[11px] font-black text-[#f5c518] shrink-0">{item.avgRating.toFixed(1)} ★</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </motion.div>
    </motion.div>
  );
}
