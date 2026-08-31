"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Heart,
  BookOpen,
  Layers,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { fetchApi, getImageUrl } from "@/lib/api";
import { toast } from "sonner";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

/* ── animation variants ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

type Tab = "all" | "urgent" | "restock" | "high_demand" | "category";
const ITEMS_PER_PAGE = 10;

interface ProcurementItem {
  bookId: string;
  title: string;
  cover_image_url?: string | null;
  bookType: "PHYSICAL" | "DIGITAL";
  author: string;
  category: string;
  available: number | null;
  totalCopies: number | null;
  wishlistCount: number;
  reservationCount: number;
  totalRentals: number;
  totalDemand: number;
  decisionUrgency: "URGENT_PURCHASE" | "RESTOCK_NEEDED" | "HIGH_DEMAND" | "BALANCED";
  recommendedAction: string;
  recommendedQuantity: number;
  pdf_access?: string;
}

interface CategoryDemandItem {
  category: string;
  wishlistCount: number;
}

interface WishlistDemandData {
  kpis: {
    totalWishlists: number;
    physicalWishlists: number;
    digitalWishlists: number;
    urgentProcurementCount: number;
    uniqueWishlistedBooks: number;
  };
  procurementItems: ProcurementItem[];
  categoryDemand: CategoryDemandItem[];
}

function BookCoverImage({ title, coverUrl }: { title: string; coverUrl?: string | null }) {
  const initialSrc = coverUrl && coverUrl.trim() ? coverUrl : "/reading_illustration.png";
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const nextSrc = coverUrl && coverUrl.trim() ? coverUrl : "/reading_illustration.png";
    setImgSrc(nextSrc);
    setHasError(false);
  }, [coverUrl]);

  if (hasError || !imgSrc) {
    return (
      <div className="w-full h-full p-1 flex flex-col justify-between bg-gradient-to-br from-[#142b6f] via-[#1e3a8a] to-[#0f172a] text-white">
        <span className="text-[7px] font-black uppercase tracking-widest text-[#f5c518] truncate">BRANA</span>
        <p className="text-[8px] font-bold leading-tight line-clamp-2 text-white/90">{title}</p>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={title}
      fill
      className="object-cover"
      unoptimized
      onError={() => {
        if (coverUrl && imgSrc === coverUrl) {
          // Attempt image proxy route
          setImgSrc(getImageUrl(coverUrl));
        } else if (imgSrc !== "/reading_illustration.png") {
          setImgSrc("/reading_illustration.png");
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

export default function AdminWishlistDemandPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<WishlistDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ data: WishlistDemandData }>("/stats/wishlist-demand");
      setData(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(t("common.error_occurred"));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.procurementItems) return [];
    return data.procurementItems.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        matchesMultiLangQuery(item.title, search) ||
        matchesMultiLangQuery(item.author, search) ||
        matchesMultiLangQuery(item.category, search) ||
        matchesMultiLangQuery(item.recommendedAction, search);

      let matchesTab = true;
      if (tab === "urgent") matchesTab = item.decisionUrgency === "URGENT_PURCHASE";
      if (tab === "restock") matchesTab = item.decisionUrgency === "RESTOCK_NEEDED";
      if (tab === "high_demand") matchesTab = item.decisionUrgency === "HIGH_DEMAND";

      return matchesSearch && matchesTab;
    });
  }, [data, search, tab]);

  const totalPages = Math.max(
    1,
    Math.ceil((tab === "category" ? (data?.categoryDemand.length || 0) : filteredItems.length) / ITEMS_PER_PAGE)
  );

  const paginatedItems = useMemo(() => {
    return filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  const paginatedCategories = useMemo(() => {
    return (data?.categoryDemand || []).slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [data?.categoryDemand, page]);

  const topCategory = data?.categoryDemand?.[0];

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: String(t("wishlist_demand.tabs.all")) },
    { key: "urgent", label: String(t("wishlist_demand.tabs.urgent")) },
    { key: "restock", label: String(t("wishlist_demand.tabs.restock")) },
    { key: "high_demand", label: String(t("wishlist_demand.tabs.high_demand")) },
    { key: "category", label: String(t("wishlist_demand.tabs.category")) },
  ];

  /* ── Column Definitions for TanStack Table (Read-Only Display) ───────── */
  const itemCols: ColumnDef<ProcurementItem, unknown>[] = [
    {
      id: "book",
      header: String(t("wishlist_demand.table.book_title")),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden border border-[#e8e4dc] bg-[#142b6f] shadow-xs">
              <BookCoverImage title={item.title} coverUrl={item.cover_image_url} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#0d0d0d] truncate max-w-[220px]">{item.title}</p>
              <p className="text-[11px] text-[#0d0d0d]/40 truncate max-w-[200px]">by {item.author}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      header: String(t("wishlist_demand.table.type")),
      cell: ({ row }) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
            row.original.bookType === "PHYSICAL"
              ? "bg-[#f5f4f0] text-[#0d0d0d] border border-[#e8e4dc]"
              : "bg-cyan-50 text-cyan-700 border border-cyan-100"
          }`}
        >
          {row.original.bookType}
        </span>
      ),
    },
    {
      id: "category",
      header: String(t("wishlist_demand.table.category")),
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/50">{row.original.category}</span>
      ),
    },
    {
      id: "stock",
      header: String(t("wishlist_demand.table.available_stock")),
      cell: ({ row }) => {
        const item = row.original;
        if (item.bookType === "DIGITAL") {
          return <span className="text-[12px] font-medium text-cyan-700">{String(t("wishlist_demand.table.digital_access"))}</span>;
        }
        const avail = item.available ?? 0;
        const total = item.totalCopies ?? 0;
        const color = avail === 0 ? "text-red-600 font-bold" : avail <= 2 ? "text-amber-600 font-bold" : "text-[#0d0d0d]";
        return (
          <div className="space-y-1">
            <span className={`text-[12px] ${color}`}>{avail} / {total}</span>
            <div className="w-20 h-1 bg-[#e8e4dc] rounded-full overflow-hidden">
              <div
                className={`h-full ${avail === 0 ? "bg-red-500" : avail <= 2 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${total > 0 ? Math.min(100, (avail / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: "wishlists",
      header: String(t("wishlist_demand.table.wishlists")),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[12px]">
          <Heart size={14} className="fill-rose-500 text-rose-500" />
          <span>{row.original.wishlistCount}</span>
        </div>
      ),
    },
    {
      id: "reservations",
      header: String(t("wishlist_demand.table.reservations")),
      cell: ({ row }) => (
        <span className="text-[12px] font-medium text-[#0d0d0d]/60">
          {row.original.reservationCount > 0
            ? String(t("wishlist_demand.table.queued", { count: row.original.reservationCount }))
            : "—"}
        </span>
      ),
    },
    {
      id: "urgency",
      header: String(t("wishlist_demand.table.urgency")),
      cell: ({ row }) => {
        const u = row.original.decisionUrgency;
        if (u === "URGENT_PURCHASE") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-red-50 text-red-700 border border-red-100">
              <AlertTriangle size={12} /> {String(t("wishlist_demand.urgency.urgent"))}
            </span>
          );
        }
        if (u === "RESTOCK_NEEDED") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100">
              <ShoppingCart size={12} /> {String(t("wishlist_demand.urgency.restock"))}
            </span>
          );
        }
        if (u === "HIGH_DEMAND") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
              <TrendingUp size={12} /> {String(t("wishlist_demand.urgency.high"))}
            </span>
          );
        }
        return (
          <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100">
            {String(t("wishlist_demand.urgency.balanced"))}
          </span>
        );
      },
    },
    {
      id: "recommendation",
      header: String(t("wishlist_demand.table.recommended_action")),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#0d0d0d]/70 max-w-[200px] truncate" title={item.recommendedAction}>
              {item.recommendedAction}
            </span>
            {item.recommendedQuantity > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black rounded bg-[#0d0d0d] text-white shrink-0">
                +{item.recommendedQuantity}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const categoryCols: ColumnDef<CategoryDemandItem, unknown>[] = [
    {
      id: "category",
      header: String(t("wishlist_demand.table.category_name")),
      cell: ({ row }) => <span className="text-[13px] font-bold text-[#0d0d0d]">{row.original.category}</span>,
    },
    {
      id: "wishlistCount",
      header: String(t("wishlist_demand.table.wishlist_demand")),
      cell: ({ row }) => (
        <span className="text-[13px] font-bold text-rose-600">
          {String(t("wishlist_demand.kpis.requests_count", { count: row.original.wishlistCount }))}
        </span>
      ),
    },
    {
      id: "share",
      header: String(t("wishlist_demand.table.demand_share")),
      cell: ({ row }) => {
        const max = data?.categoryDemand?.[0]?.wishlistCount || 1;
        const pct = Math.round((row.original.wishlistCount / max) * 100);
        return (
          <div className="flex items-center gap-3 w-48">
            <div className="flex-1 h-2 bg-[#f5f4f0] rounded-full overflow-hidden border border-[#e8e4dc]">
              <div className="h-full bg-[#f5c518] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-[#0d0d0d]/40 tabular-nums">{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">
            {String(t("wishlist_demand.eyebrow"))}
          </p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
            {String(t("wishlist_demand.title"))}
          </h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">
            {String(t("wishlist_demand.subtitle"))}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] disabled:opacity-40 transition-colors shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {String(t("wishlist_demand.refresh"))}
          </button>
        </div>
      </motion.div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────────────── */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Wishlists */}
        <motion.div variants={fadeUp} className="bg-[#142b6f] rounded-2xl p-4 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/50">
              {String(t("wishlist_demand.kpis.total_wishlists"))}
            </span>
            <Heart size={16} className="text-rose-300 fill-rose-300/30" />
          </div>
          <div className="mt-3">
            <p className="text-[28px] font-serif font-black tabular-nums">{loading ? "…" : data?.kpis.totalWishlists || 0}</p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {String(
                t("wishlist_demand.kpis.wishlist_breakdown", {
                  physical: data?.kpis.physicalWishlists || 0,
                  digital: data?.kpis.digitalWishlists || 0,
                })
              )}
            </p>
          </div>
        </motion.div>

        {/* Card 2: Urgent Restocks */}
        <motion.div
          variants={fadeUp}
          className={`rounded-2xl p-4 border flex flex-col justify-between ${
            (data?.kpis.urgentProcurementCount || 0) > 0
              ? "bg-[#fef2f2] border-red-100 text-red-700"
              : "bg-white border-[#e8e4dc] text-[#0d0d0d]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                (data?.kpis.urgentProcurementCount || 0) > 0 ? "text-red-400" : "text-[#0d0d0d]/40"
              }`}
            >
              {String(t("wishlist_demand.kpis.urgent_restock"))}
            </span>
            <AlertTriangle
              size={16}
              className={(data?.kpis.urgentProcurementCount || 0) > 0 ? "text-red-500 animate-pulse" : "text-[#0d0d0d]/30"}
            />
          </div>
          <div className="mt-3">
            <p className="text-[28px] font-serif font-black tabular-nums">{loading ? "…" : data?.kpis.urgentProcurementCount || 0}</p>
            <p className={`text-[10px] ${(data?.kpis.urgentProcurementCount || 0) > 0 ? "text-red-400" : "text-[#0d0d0d]/30"}`}>
              {String(t("wishlist_demand.kpis.urgent_desc"))}
            </p>
          </div>
        </motion.div>

        {/* Card 3: Unique Books */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-4 text-[#0d0d0d] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0d0d0d]/40">
              {String(t("wishlist_demand.kpis.unique_titles"))}
            </span>
            <BookOpen size={16} className="text-[#0d0d0d]/30" />
          </div>
          <div className="mt-3">
            <p className="text-[28px] font-serif font-black tabular-nums">{loading ? "…" : data?.kpis.uniqueWishlistedBooks || 0}</p>
            <p className="text-[10px] text-[#0d0d0d]/30">{String(t("wishlist_demand.kpis.unique_desc"))}</p>
          </div>
        </motion.div>

        {/* Card 4: Top Category */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-4 text-[#0d0d0d] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0d0d0d]/40">
              {String(t("wishlist_demand.kpis.top_subject"))}
            </span>
            <Layers size={16} className="text-[#0d0d0d]/30" />
          </div>
          <div className="mt-3">
            <p className="text-[18px] font-serif font-black truncate">{loading ? "…" : topCategory?.category || String(t("wishlist_demand.kpis.no_category"))}</p>
            <p className="text-[10px] text-[#0d0d0d]/30">
              {topCategory
                ? String(t("wishlist_demand.kpis.requests_count", { count: topCategory.wishlistCount }))
                : String(t("wishlist_demand.kpis.no_category"))}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main Toolbar (Search + Tab Bar) ─────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e4dc] pb-3">
        {/* Tab Bar */}
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => {
                setTab(tb.key);
                setPage(1);
              }}
              className={`px-4 py-2.5 text-[12.5px] font-bold border-b-2 whitespace-nowrap transition-colors ${
                tab === tb.key
                  ? "border-[#0d0d0d] text-[#0d0d0d]"
                  : "border-transparent text-[#0d0d0d]/40 hover:text-[#0d0d0d]"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {tab !== "category" && (
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={String(t("wishlist_demand.search_placeholder"))}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"
            />
          </div>
        )}
      </motion.div>

      {/* ── TanStack Table (Read-Only Display) ──────────────────────────────── */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden shadow-xs">
        {tab === "category" ? (
          <TanStackTable
            data={paginatedCategories}
            columns={categoryCols}
            isLoading={loading}
            emptyText={String(t("wishlist_demand.table.empty_categories"))}
            skeletonRows={5}
          />
        ) : (
          <TanStackTable
            data={paginatedItems}
            columns={itemCols}
            isLoading={loading}
            emptyText={String(t("wishlist_demand.table.empty_items"))}
            skeletonRows={5}
          />
        )}
      </motion.div>

      {/* ── Pagination Bar ───────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
            {String(t("common.pagination.previous"))}
          </button>
          <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"
          >
            {String(t("common.pagination.next"))}
            <ChevronRight size={14} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
