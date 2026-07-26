"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useStatsOverview,
  useStatsTargets,
  useUpdateTargets,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

/* ── animation variants ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ── types ──────────────────────────────────────────────── */
type WeeklyPoint = { week_start: string; count: number };
type GoalProgress = { target: number; actual: number; progress: number };
type Overview = {
  users:   { total: number; newThisMonth: number; blocked: number };
  books:   { total: number; available: number; outOfStock: number };
  rentals: { active: number; overdue: number; reservations: number; completed: number };
  revenue: { thisMonth: number; growth: number };
  monthlyTargets: { progress: { rentals: GoalProgress; activeReaders: GoalProgress; onTimeReturns: GoalProgress; newBooks: GoalProgress } };
  trends:  { rentalsPerWeek: WeeklyPoint[] };
};

/* ── normalisation helpers ───────────────────────────────── */
const toN  = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clamp = (v: unknown) => Math.max(0, Math.min(100, toN(v)));
const obj   = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});

const normGoal = (v: unknown): GoalProgress => {
  const s = obj(v);
  const target = toN(s.target), actual = toN(s.actual);
  const progress = s.progress == null && target > 0 ? (actual / target) * 100 : toN(s.progress);
  return { target, actual, progress: clamp(progress) };
};

const normPoints = (v: unknown): WeeklyPoint[] =>
  Array.isArray(v)
    ? v.map(i => { const p = obj(i); return { week_start: String(p.week_start ?? p.weekStart ?? ""), count: toN(p.count ?? p.value ?? p.total) }; })
    : [];

const normOverview = (v: unknown): Overview => {
  const r = obj(v);
  const u = obj(r.users); const b = obj(r.books); const ren = obj(r.rentals);
  const rev = obj(r.revenue);
  const mt  = obj(r.monthlyTargets ?? r.monthly_targets);
  const pr  = obj(mt.progress);
  const tr  = obj(r.trends);
  return {
    users:   { total: toN(u.total), newThisMonth: toN(u.newThisMonth ?? u.new_this_month), blocked: toN(u.blocked) },
    books:   { total: toN(b.total), available: toN(b.available), outOfStock: toN(b.outOfStock ?? b.out_of_stock) },
    rentals: { active: toN(ren.active), overdue: toN(ren.overdue), reservations: toN(ren.reservations), completed: toN(ren.completed) },
    revenue: { thisMonth: toN(rev.thisMonth ?? rev.this_month), growth: toN(rev.growth) },
    monthlyTargets: { progress: {
      rentals:       normGoal(pr.rentals),
      activeReaders: normGoal(pr.activeReaders ?? pr.active_readers),
      onTimeReturns: normGoal(pr.onTimeReturns ?? pr.on_time_returns),
      newBooks:      normGoal(pr.newBooks ?? pr.new_books),
    }},
    trends: { rentalsPerWeek: normPoints(tr.rentalsPerWeek ?? tr.rentals_per_week) },
  };
};

const defaultOverview: Overview = {
  users:   { total: 0, newThisMonth: 0, blocked: 0 },
  books:   { total: 0, available: 0, outOfStock: 0 },
  rentals: { active: 0, overdue: 0, reservations: 0, completed: 0 },
  revenue: { thisMonth: 0, growth: 0 },
  monthlyTargets: { progress: { rentals: { target:0,actual:0,progress:0 }, activeReaders: { target:0,actual:0,progress:0 }, onTimeReturns: { target:0,actual:0,progress:0 }, newBooks: { target:0,actual:0,progress:0 } } },
  trends:  { rentalsPerWeek: [] },
};

/* ── stat card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = false, loading = false }: { label: string; value: string | number; sub?: string; accent?: boolean; loading?: boolean }) {
  return (
    <motion.div variants={fadeUp}
      className={`rounded-2xl border p-5 ${accent ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-[#e8e4dc]"}`}>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className={`h-7 w-12 rounded ${accent ? "bg-white/10" : "bg-[#f0eeea]"}`} />
          <div className={`h-3 w-24 rounded ${accent ? "bg-white/10" : "bg-[#f0eeea]"}`} />
        </div>
      ) : (
        <>
          <p className={`text-[28px] font-serif font-black leading-none ${accent ? "text-[#f5c518]" : "text-[#0d0d0d]"}`}>{value}</p>
          <p className={`text-[9px] font-black uppercase tracking-[0.16em] mt-2 ${accent ? "text-white/45" : "text-[#0d0d0d]/40"}`}>{label}</p>
          {sub && <p className={`text-[11px] mt-0.5 ${accent ? "text-white/30" : "text-[#0d0d0d]/30"}`}>{sub}</p>}
        </>
      )}
    </motion.div>
  );
}

/* ── goal progress row ───────────────────────────────────── */
function GoalRow({ label, item }: { label: string; item: GoalProgress }) {
  const pct = clamp(item.progress);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#0d0d0d]">{label}</span>
        <span className="text-[11px] text-[#0d0d0d]/50 tabular-nums">{item.actual} / {item.target}</span>
      </div>
      <div className="h-1.5 bg-[#e8e4dc] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-full bg-[#f5c518]"
        />
      </div>
      <p className="text-[10px] text-[#0d0d0d]/35">{pct.toFixed(0)}% of target</p>
    </div>
  );
}

/* ── sparkline chart ─────────────────────────────────────── */
function Sparkline({ points }: { points: WeeklyPoint[] }) {
  const { t } = useLanguage();
  const W = 600; const H = 180; const PAD = 20;
  const safe = points.length > 0 ? points : [{ week_start: "", count: 0 }];
  const max  = Math.max(...safe.map(p => p.count), 1);

  const pts = safe.map((p, i) => ({
    x: PAD + (i * (W - PAD * 2)) / Math.max(1, safe.length - 1),
    y: H - PAD - (p.count / max) * (H - PAD * 2),
    label: p.week_start, count: p.count,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Filled area path
  const area = `${path} L${pts[pts.length-1].x},${H-PAD} L${pts[0].x},${H-PAD} Z`;

  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
        {String(t("dashboard.rentals_per_week"))}
      </p>
      <div className="bg-white rounded-2xl border border-[#e8e4dc] p-5 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
          {/* Grid lines */}
          {[0,1,2,3,4].map(i => (
            <line key={i}
              x1={PAD} y1={PAD + i * (H - PAD*2) / 4}
              x2={W - PAD} y2={PAD + i * (H - PAD*2) / 4}
              stroke="#e8e4dc" strokeWidth="1"
            />
          ))}
          {/* Fill */}
          <path d={area} fill="rgba(245,197,24,0.08)" />
          {/* Line */}
          <motion.path
            d={path}
            fill="none"
            stroke="#f5c518"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#f5c518" stroke="white" strokeWidth="2" />
          ))}
        </svg>
        {safe.length > 1 && (
          <div className="flex justify-between mt-2">
            {pts.map((p, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-black text-[#0d0d0d]">{p.count}</p>
                <p className="text-[8px] text-[#0d0d0d]/30 mt-0.5 truncate max-w-[60px]">
                  {p.label ? new Date(p.label).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    target_rentals: "", target_active_readers: "",
    target_on_time_returns: "", target_new_books: "",
  });

  const { data: overviewData, isLoading } = useStatsOverview();
  const { data: targetsData }             = useStatsTargets();
  const updateTargets                     = useUpdateTargets();

  const overview = useMemo(() => {
    const payload = (overviewData as { data?: unknown } | undefined)?.data ?? overviewData;
    return payload ? normOverview(payload) : defaultOverview;
  }, [overviewData]);

  const target = targetsData?.data?.target as {
    target_rentals?: number; target_active_readers?: number;
    target_on_time_returns?: number; target_new_books?: number;
  } | undefined;

  useEffect(() => {
    if (!target) return;
    const t2 = setTimeout(() => setForm({
      target_rentals:       String(target.target_rentals        ?? 0),
      target_active_readers:String(target.target_active_readers ?? 0),
      target_on_time_returns:String(target.target_on_time_returns ?? 0),
      target_new_books:     String(target.target_new_books      ?? 0),
    }), 0);
    return () => clearTimeout(t2);
  }, [target]);

  const saveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTargets.mutateAsync({
        target_rentals:         Number(form.target_rentals || 0),
        target_active_readers:  Number(form.target_active_readers || 0),
        target_on_time_returns: Number(form.target_on_time_returns || 0),
        target_new_books:       Number(form.target_new_books || 0),
      });
      toast.success("Targets saved");
    } catch { toast.error("Failed to save targets"); }
  };

  const IC = "w-full px-3 py-2.5 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 sm:p-6 space-y-8">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("dashboard.analytics_title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("dashboard.analytics_subtitle"))}</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label={String(t("dashboard.stats.students"))}     value={overview.users.total}         sub={`+${overview.users.newThisMonth} this month`} loading={isLoading} />
        <StatCard label={String(t("dashboard.stats.books"))}        value={overview.books.total}         sub={`${overview.books.available} available`}       loading={isLoading} />
        <StatCard label={String(t("dashboard.stats.active_rentals"))} value={overview.rentals.active}    loading={isLoading} />
        <StatCard label={String(t("dashboard.stats.overdue"))}      value={overview.rentals.overdue}     accent={overview.rentals.overdue > 0} loading={isLoading} />
        <StatCard label={String(t("dashboard.stats.reservations"))} value={overview.rentals.reservations} loading={isLoading} />
        <StatCard label={String(t("dashboard.stats.revenue"))}      value={`${overview.revenue.thisMonth} ETB`} loading={isLoading} />
      </motion.div>

      {/* Chart + goals */}
      <motion.div variants={stagger} className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Sparkline */}
        <motion.div variants={fadeUp} className="xl:col-span-2">
          <Sparkline points={overview.trends.rentalsPerWeek} />
        </motion.div>

        {/* Goal progress */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-5 space-y-4">
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
            {String(t("dashboard.goal_progress"))}
          </p>
          <GoalRow label={String(t("dashboard.targets.rentals"))}        item={overview.monthlyTargets.progress.rentals} />
          <GoalRow label={String(t("dashboard.targets.active_readers"))} item={overview.monthlyTargets.progress.activeReaders} />
          <GoalRow label={String(t("dashboard.targets.on_time_returns"))} item={overview.monthlyTargets.progress.onTimeReturns} />
          <GoalRow label={String(t("dashboard.targets.new_books"))}      item={overview.monthlyTargets.progress.newBooks} />
        </motion.div>
      </motion.div>

      {/* Set targets */}
      <motion.div variants={fadeUp}>
        <form onSubmit={saveTargets} className="bg-white rounded-2xl border border-[#e8e4dc] p-5 sm:p-6 space-y-5">
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
            {String(t("dashboard.targets.title"))}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              ["target_rentals",         t("dashboard.targets.rentals")],
              ["target_active_readers",  t("dashboard.targets.active_readers")],
              ["target_on_time_returns", t("dashboard.targets.on_time_returns")],
              ["target_new_books",       t("dashboard.targets.new_books")],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wide">{label}</label>
                <input
                  type="number" min={0}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className={IC}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={updateTargets.isPending}
            className="px-6 py-2.5 rounded-full bg-[#0d0d0d] text-white text-[12px] font-bold hover:bg-[#292524] disabled:opacity-50 transition-colors"
          >
            {updateTargets.isPending ? String(t("dashboard.targets.saving")) : String(t("dashboard.targets.save"))}
          </button>
        </form>
      </motion.div>

    </motion.div>
  );
}
