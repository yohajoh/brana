"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useStatsOverview, useStatsTargets, useUpdateTargets } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type WeeklyPoint = { week_start: string; count: number };

type GoalProgress = {
  target: number;
  actual: number;
  progress: number;
};

type Overview = {
  users: { total: number; newThisMonth: number; blocked: number };
  books: { total: number; available: number; outOfStock: number };
  rentals: { active: number; overdue: number; reservations: number; completed: number };
  revenue: { thisMonth: number; growth: number };
  monthlyTargets: {
    progress: {
      rentals: GoalProgress;
      activeReaders: GoalProgress;
      onTimeReturns: GoalProgress;
      newBooks: GoalProgress;
    };
  };
  trends: { rentalsPerWeek: WeeklyPoint[] };
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clampProgress = (value: unknown) => Math.max(0, Math.min(100, toNumber(value)));

const readObject = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
};

const normalizeGoalProgress = (value: unknown): GoalProgress => {
  const source = readObject(value);
  const target = toNumber(source.target);
  const actual = toNumber(source.actual);
  const progress = source.progress == null && target > 0 ? (actual / target) * 100 : toNumber(source.progress);

  return {
    target,
    actual,
    progress: clampProgress(progress),
  };
};

const normalizeWeeklyPoints = (value: unknown): WeeklyPoint[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const point = readObject(item);
    return {
      week_start: String(point.week_start ?? point.weekStart ?? ""),
      count: toNumber(point.count ?? point.value ?? point.total),
    };
  });
};

const normalizeOverview = (value: unknown): Overview => {
  const root = readObject(value);
  const users = readObject(root.users);
  const books = readObject(root.books);
  const rentals = readObject(root.rentals);
  const revenue = readObject(root.revenue);
  const monthlyTargets = readObject(root.monthlyTargets ?? root.monthly_targets);
  const progress = readObject(monthlyTargets.progress);
  const trends = readObject(root.trends);

  return {
    users: {
      total: toNumber(users.total),
      newThisMonth: toNumber(users.newThisMonth ?? users.new_this_month),
      blocked: toNumber(users.blocked),
    },
    books: {
      total: toNumber(books.total),
      available: toNumber(books.available),
      outOfStock: toNumber(books.outOfStock ?? books.out_of_stock),
    },
    rentals: {
      active: toNumber(rentals.active),
      overdue: toNumber(rentals.overdue),
      reservations: toNumber(rentals.reservations),
      completed: toNumber(rentals.completed),
    },
    revenue: {
      thisMonth: toNumber(revenue.thisMonth ?? revenue.this_month),
      growth: toNumber(revenue.growth),
    },
    monthlyTargets: {
      progress: {
        rentals: normalizeGoalProgress(progress.rentals),
        activeReaders: normalizeGoalProgress(progress.activeReaders ?? progress.active_readers),
        onTimeReturns: normalizeGoalProgress(progress.onTimeReturns ?? progress.on_time_returns),
        newBooks: normalizeGoalProgress(progress.newBooks ?? progress.new_books),
      },
    },
    trends: {
      rentalsPerWeek: normalizeWeeklyPoints(trends.rentalsPerWeek ?? trends.rentals_per_week),
    },
  };
};

const defaultOverview: Overview = {
  users: { total: 0, newThisMonth: 0, blocked: 0 },
  books: { total: 0, available: 0, outOfStock: 0 },
  rentals: { active: 0, overdue: 0, reservations: 0, completed: 0 },
  revenue: { thisMonth: 0, growth: 0 },
  monthlyTargets: {
    progress: {
      rentals: { target: 0, actual: 0, progress: 0 },
      activeReaders: { target: 0, actual: 0, progress: 0 },
      onTimeReturns: { target: 0, actual: 0, progress: 0 },
      newBooks: { target: 0, actual: 0, progress: 0 },
    },
  },
  trends: { rentalsPerWeek: [] },
};

function ProgressRow({ label, item }: { label: string; item: GoalProgress }) {
  const width = clampProgress(item.progress);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#111111]">{label}</span>
        <span className="text-[#142B6F]">
          {item.actual} / {item.target}
        </span>
      </div>
      <progress
        value={width}
        max={100}
        className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[#E1DEE5] [&::-webkit-progress-value]:bg-[#142B6F] [&::-moz-progress-bar]:bg-[#142B6F]"
      />
    </div>
  );
}

function LineChart({ points }: { points: WeeklyPoint[] }) {
  const { t } = useLanguage();
  const width = 680;
  const height = 220;
  const pad = 24;
  const safePoints = points.length > 0 ? points : [{ week_start: "", count: 0 }];
  const max = Math.max(...safePoints.map((p) => p.count), 1);

  const mapped = safePoints.map((p, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, safePoints.length - 1);
    const y = height - pad - (p.count / max) * (height - pad * 2);
    return { x, y, label: p.week_start, value: p.count };
  });

  const d = mapped.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4">
      <h3 className="text-sm font-bold text-[#111111] mb-3">{t("dashboard.rentals_per_week")}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52">
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad + (i * (height - pad * 2)) / 4;
          return <line key={i} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#E1DEE5" strokeWidth="1" />;
        })}
        <path d={d} fill="none" stroke="#142B6F" strokeWidth="3" />
        {mapped.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#111111" />
        ))}
      </svg>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#142B6F] mt-2">
        {mapped.map((p, i) => (
          <div key={i} className="truncate">{p.label || t("sidebar.history").split(" ")[0]}: {p.value}</div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    target_rentals: "",
    target_active_readers: "",
    target_on_time_returns: "",
    target_new_books: "",
  });

  const { data: overviewData, isLoading: overviewLoading } = useStatsOverview();
  const { data: targetsData } = useStatsTargets();
  const updateTargets = useUpdateTargets();

  const overview = useMemo(() => {
    const payload = (overviewData as { data?: unknown } | undefined)?.data ?? overviewData;
    if (!payload) return defaultOverview;
    return normalizeOverview(payload);
  }, [overviewData]);

  const target = targetsData?.data?.target as {
    target_rentals?: number;
    target_active_readers?: number;
    target_on_time_returns?: number;
    target_new_books?: number;
  } | undefined;

  // Load targets into form when data is available
  useEffect(() => {
    if (target) {
      const timer = setTimeout(() => {
        setForm({
          target_rentals: String(target.target_rentals ?? 0),
          target_active_readers: String(target.target_active_readers ?? 0),
          target_on_time_returns: String(target.target_on_time_returns ?? 0),
          target_new_books: String(target.target_new_books ?? 0),
        });
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [target]);

  const loading = overviewLoading;

  const summary = useMemo(
    () => [
      { label: t("dashboard.stats.students"), value: overview.users.total },
      { label: t("dashboard.stats.books"), value: overview.books.total },
      { label: t("dashboard.stats.active_rentals"), value: overview.rentals.active },
      { label: t("dashboard.stats.overdue"), value: overview.rentals.overdue },
      { label: t("dashboard.stats.reservations"), value: overview.rentals.reservations },
      { label: t("dashboard.stats.revenue"), value: `${overview.revenue.thisMonth} ETB` },
    ],
    [overview, t],
  );

  const saveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTargets.mutateAsync({
        target_rentals: Number(form.target_rentals || 0),
        target_active_readers: Number(form.target_active_readers || 0),
        target_on_time_returns: Number(form.target_on_time_returns || 0),
        target_new_books: Number(form.target_new_books || 0),
      });
      toast.success("Targets saved successfully");
    } catch {
      toast.error("Failed to save targets");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
          {t("dashboard.analytics_title")}
        </h1>
        <p className="text-[#142B6F] font-medium">{t("dashboard.analytics_subtitle")}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#142B6F]">{t("dashboard.loading")}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {summary.map((item) => (
              <div key={item.label} className="bg-white border border-[#E1DEE5]/50 rounded-xl p-3 sm:p-4 shadow-sm">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#142B6F] font-bold truncate">
                  {item.label}
                </p>
                <p className="text-xl sm:text-2xl font-black text-[#111111] mt-1 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <LineChart points={overview.trends?.rentalsPerWeek || []} />
            </div>
            <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#111111]">{t("dashboard.goal_progress")}</h3>
              <ProgressRow label={t("dashboard.targets.rentals")} item={overview.monthlyTargets.progress.rentals} />
              <ProgressRow label={t("dashboard.targets.active_readers")} item={overview.monthlyTargets.progress.activeReaders} />
              <ProgressRow label={t("dashboard.targets.on_time_returns")} item={overview.monthlyTargets.progress.onTimeReturns} />
              <ProgressRow label={t("dashboard.targets.new_books")} item={overview.monthlyTargets.progress.newBooks} />
            </div>
          </div>

          <form onSubmit={saveTargets} className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">{t("dashboard.targets.title")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label={t("dashboard.targets.rentals")} value={form.target_rentals} onChange={(v) => setForm((p) => ({ ...p, target_rentals: v }))} />
              <Field label={t("dashboard.targets.active_readers")} value={form.target_active_readers} onChange={(v) => setForm((p) => ({ ...p, target_active_readers: v }))} />
              <Field label={t("dashboard.targets.on_time_returns")} value={form.target_on_time_returns} onChange={(v) => setForm((p) => ({ ...p, target_on_time_returns: v }))} />
              <Field label={t("dashboard.targets.new_books")} value={form.target_new_books} onChange={(v) => setForm((p) => ({ ...p, target_new_books: v }))} />
            </div>
            <button type="submit" disabled={updateTargets.isPending} className="px-4 py-2.5 rounded-xl bg-[#142B6F] text-white text-sm font-bold disabled:opacity-50">
              {updateTargets.isPending ? t("dashboard.targets.saving") : t("dashboard.targets.save")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-bold text-[#111111]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[#E1DEE5] text-sm"
      />
    </label>
  );
}
