"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useStatsOverview,
  useStatsTargets,
  useUpdateTargets,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TrendingUp, Target } from "lucide-react";

/* ── animation variants ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
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
const toN   = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clamp = (v: unknown) => Math.max(0, Math.min(100, toN(v)));
const obj   = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});

const normGoal = (v: unknown): GoalProgress => {
  const s = obj(v);
  const target = toN(s.target), actual = toN(s.actual);
  const progress = s.progress == null && target > 0 ? (actual / target) * 100 : toN(s.progress);
  return { target, actual, progress: clamp(progress) };
};

const normPoints = (v: unknown): WeeklyPoint[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((i) => {
      const p = obj(i);
      const week_start = String(
        p.week_start ?? p.weekStart ?? p.week ?? p.date ?? p.period ?? ""
      );
      const count = toN(
        p.count ?? p.value ?? p.total ?? p.rentals ?? p.rental_count ?? 0
      );
      return { week_start, count };
    })
    .filter((p) => p.week_start !== "");
};

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
    trends: { rentalsPerWeek: normPoints(tr.rentalsPerWeek ?? tr.rentals_per_week ?? tr.weekly ?? tr.weekly_rentals ?? r.rentalsPerWeek ?? r.rentals_per_week) },
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
function StatCard({
  label, value, sub, colorIdx = 1, loading = false,
}: {
  label: string; value: string | number; sub?: string;
  colorIdx?: number; loading?: boolean;
}) {
  const palettes = [
    { bg: "bg-[#142b6f]", val: "text-white", lab: "text-white/50", sub: "text-white/40", border: "" },
    { bg: "bg-white", val: "text-[#0d0d0d]", lab: "text-[#0d0d0d]/40", sub: "text-[#0d0d0d]/30", border: "border border-[#e8e4dc]" },
    { bg: "bg-white", val: "text-[#0d0d0d]", lab: "text-[#0d0d0d]/40", sub: "text-[#0d0d0d]/30", border: "border border-[#e8e4dc]" },
    { bg: "bg-[#fef2f2]", val: "text-red-700", lab: "text-red-400/80", sub: "text-red-300", border: "border border-red-100" },
    { bg: "bg-white", val: "text-[#0d0d0d]", lab: "text-[#0d0d0d]/40", sub: "text-[#0d0d0d]/30", border: "border border-[#e8e4dc]" },
    { bg: "bg-[#f5f4f0]", val: "text-[#0d0d0d]", lab: "text-[#0d0d0d]/40", sub: "text-[#0d0d0d]/30", border: "border border-[#e8e4dc]" },
  ];
  const c = palettes[colorIdx] ?? palettes[1];
  return (
    <motion.div variants={fadeUp} className={`rounded-2xl px-4 py-3.5 flex flex-col gap-1.5 ${c.bg} ${c.border}`}>
      {loading ? (
        <div className="animate-pulse space-y-1.5">
          <div className="h-7 w-14 rounded-lg bg-current opacity-10" />
          <div className="h-2 w-20 rounded-full bg-current opacity-10" />
        </div>
      ) : (
        <>
          <p className={`text-[26px] font-serif font-black leading-none tabular-nums ${c.val}`}>{value}</p>
          <p className={`text-[8.5px] font-black uppercase tracking-[0.16em] ${c.lab}`}>{label}</p>
          {sub && <p className={`text-[10px] ${c.sub}`}>{sub}</p>}
        </>
      )}
    </motion.div>
  );
}

/* ── custom tooltip for recharts ─────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const date = label ? new Date(label) : null;
  const formatted = date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : label;
  return (
    <div className="bg-[#0d0d0d] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[11px] text-white/50 mb-0.5">{formatted}</p>
      <p className="text-[16px] font-black text-[#f5c518]">{payload[0].value}</p>
      <p className="text-[10px] text-white/40">rentals</p>
    </div>
  );
}

/* ── wave area chart ─────────────────────────────────────── */
function RentalsChart({ points, loading }: { points: WeeklyPoint[]; loading: boolean }) {
  const { t } = useLanguage();

  // Only use real data — never fabricate zeros
  const hasData = points.length > 0 && points.some((p) => p.count > 0);

  // Need at least 3 points for monotone to show curves — pad if needed
  const data = useMemo(() => {
    if (!hasData) return points;
    if (points.length < 3) {
      // Insert synthetic midpoints so the curve has shape
      const filled: WeeklyPoint[] = [];
      for (let i = 0; i < points.length; i++) {
        filled.push(points[i]);
        if (i < points.length - 1) {
          const mid = Math.round((points[i].count + points[i + 1].count) / 2);
          const midDate = new Date(
            (new Date(points[i].week_start).getTime() + new Date(points[i + 1].week_start).getTime()) / 2
          ).toISOString();
          filled.push({ week_start: midDate, count: mid });
        }
      }
      return filled;
    }
    return points;
  }, [points, hasData]);

  const maxVal = Math.max(...(data.length > 0 ? data : points).map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
            {String(t("dashboard.rentals_per_week"))}
          </p>
          <p className="text-[18px] font-serif font-black text-[#0d0d0d] mt-0.5">
            Rental Activity
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f5c518]/10 rounded-full">
          <TrendingUp size={13} className="text-[#92700c]" strokeWidth={2.5} />
          <span className="text-[11px] font-black text-[#92700c]">Weekly</span>
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-2xl border border-[#e8e4dc] p-5 pt-4">
        {loading ? (
          <div className="h-[220px] bg-[#f5f4f0] rounded-xl animate-pulse" />
        ) : !hasData ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2">
            <TrendingUp size={28} className="text-[#e8e4dc]" />
            <p className="text-[13px] font-semibold text-[#0d0d0d]/25">No rental data yet</p>
            <p className="text-[11px] text-[#0d0d0d]/20">Chart will appear once rentals are recorded</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="rentalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5c518" stopOpacity={0.32} />
                    <stop offset="55%" stopColor="#f5c518" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#f5c518" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e8e4dc"
                  strokeWidth={0.8}
                  vertical={false}
                />
                <XAxis
                  dataKey="week_start"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "rgba(13,13,13,0.3)", fontWeight: 700 }}
                  tickFormatter={(v) =>
                    v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
                  }
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "rgba(13,13,13,0.3)", fontWeight: 700 }}
                  allowDecimals={false}
                  domain={[0, Math.ceil(maxVal * 1.25)]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(245,197,24,0.25)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f5c518"
                  strokeWidth={2.5}
                  fill="url(#rentalGrad)"
                  dot={{ r: 3.5, fill: "#f5c518", stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#f5c518", stroke: "white", strokeWidth: 2.5 }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Bottom summary row */}
            <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-[#e8e4dc]">
              {[
                { label: "Total", value: data.reduce((s, d) => s + d.count, 0) },
                { label: "Peak Week", value: Math.max(...data.map((d) => d.count)) },
                { label: "Avg / Week", value: data.length ? Math.round(data.reduce((s, d) => s + d.count, 0) / data.length) : 0 },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[18px] font-serif font-black text-[#0d0d0d]">{s.value}</p>
                  <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── goal progress row ───────────────────────────────────── */
function GoalRow({ label, item }: { label: string; item: GoalProgress }) {
  const pct = clamp(item.progress);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-[#f5c518]" : "bg-red-400";
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
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <p className="text-[10px] text-[#0d0d0d]/35">{pct.toFixed(0)}% of target</p>
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
      target_rentals:        String(target.target_rentals        ?? 0),
      target_active_readers: String(target.target_active_readers ?? 0),
      target_on_time_returns:String(target.target_on_time_returns ?? 0),
      target_new_books:      String(target.target_new_books      ?? 0),
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

  const IC = "w-full px-3 py-2.5 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

  const stats = [
    { label: String(t("dashboard.stats.students")),       value: overview.users.total,              sub: `+${overview.users.newThisMonth} this month`, colorIdx: 0 },
    { label: String(t("dashboard.stats.books")),          value: overview.books.total,              sub: `${overview.books.available} available`,      colorIdx: 1 },
    { label: String(t("dashboard.stats.active_rentals")), value: overview.rentals.active,           sub: undefined,                                    colorIdx: 2 },
    { label: String(t("dashboard.stats.overdue")),        value: overview.rentals.overdue,          sub: undefined,                                    colorIdx: overview.rentals.overdue > 0 ? 3 : 1 },
    { label: String(t("dashboard.stats.reservations")),   value: overview.rentals.reservations,     sub: undefined,                                    colorIdx: 4 },
    { label: String(t("dashboard.stats.revenue")),        value: `${overview.revenue.thisMonth} ETB`, sub: undefined,                                  colorIdx: 5 },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-8">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("dashboard.analytics_title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("dashboard.analytics_subtitle"))}</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} colorIdx={s.colorIdx} loading={isLoading} />
        ))}
      </motion.div>

      {/* Chart + goals */}
      <motion.div variants={stagger} className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Wave area chart */}
        <motion.div variants={fadeUp} className="xl:col-span-2">
          <RentalsChart points={overview.trends.rentalsPerWeek} loading={isLoading} />
        </motion.div>

        {/* Goal progress */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#0d0d0d]/30" strokeWidth={2} />
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
              {String(t("dashboard.goal_progress"))}
            </p>
          </div>
          <GoalRow label={String(t("dashboard.targets.rentals"))}        item={overview.monthlyTargets.progress.rentals} />
          <GoalRow label={String(t("dashboard.targets.active_readers"))} item={overview.monthlyTargets.progress.activeReaders} />
          <GoalRow label={String(t("dashboard.targets.on_time_returns"))} item={overview.monthlyTargets.progress.onTimeReturns} />
          <GoalRow label={String(t("dashboard.targets.new_books"))}      item={overview.monthlyTargets.progress.newBooks} />
        </motion.div>
      </motion.div>

      {/* Set targets */}
      <motion.div variants={fadeUp}>
        <form onSubmit={saveTargets} className="bg-white rounded-2xl border border-[#e8e4dc] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#0d0d0d]/30" strokeWidth={2} />
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
              {String(t("dashboard.targets.title"))}
            </p>
          </div>
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
