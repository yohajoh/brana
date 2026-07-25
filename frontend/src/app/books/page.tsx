"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";
import { useBooks, useDigitalBooks, useCategories, useAuthors } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";

export type CatalogBook = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pages: number;
  copies: number;
  available: number;
  author: { id: string; name: string; image?: string | null };
  category: { id: string; name: string; slug: string };
  rating: { average: number; total: number; distribution?: Record<number, number> };
  _count?: { rentals?: number; reviews?: number; wishlists?: number };
  type: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { books: number; digital_books: number };
};

type Author = { id: string; name: string };
type CatalogMode = "all" | "physical" | "digital";

const parsePositiveInt = (v: string | null, fb: number) => {
  const n = Number.parseInt(v || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fb;
};

const FILTER_KEYS = ["category_id", "author_id", "min_rating"] as const;

/* ── Input component ── */
const FilterInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-xl border border-[#e2e0e7] bg-white px-3 py-2.5 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.25)] transition-all"
  />
);

const FilterSelect = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full rounded-xl border border-[#e2e0e7] bg-white px-3 py-2.5 text-sm text-[#0d0d0d] outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.25)] transition-all cursor-pointer appearance-none"
  />
);

function BooksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  /* Track whether the page header (search bar) has scrolled out of view */
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  /* Track whether the main filters section has scrolled out of view */
  const [filtersHidden, setFiltersHidden] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const page           = parsePositiveInt(searchParams.get("page"), 1);
  const selectedCategory = searchParams.get("category") || null;
  const searchQuery    = searchParams.get("search") || "";
  const sortBy         = searchParams.get("sort") || "title";
  const rawMode        = (searchParams.get("mode") || "all") as CatalogMode;
  const mode: CatalogMode = ["physical", "digital"].includes(rawMode) ? rawMode : "all";
  const selectedAuthor = searchParams.get("author") || "";
  const availabilityRaw = searchParams.get("availability") || "";
  const availability: "" | "true" | "false" =
    availabilityRaw === "true" || availabilityRaw === "false" ? availabilityRaw : "";
  const minRating = searchParams.get("minRating") || "";
  const year      = searchParams.get("year") || "";
  const tags      = searchParams.get("tags") || "";
  const topics    = searchParams.get("topics") || "";
  const limit     = 12;

  const updateQuery = useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      FILTER_KEYS.forEach((k) => next.delete(k));
      Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      if (resetPage) next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories("limit=50");
  const { data: authorsData } = useAuthors("limit=50");

  const categories: Category[] = useMemo(
    () =>
      ((categoriesData?.categories || []) as unknown as Category[]).map((cat) => ({
        ...cat,
        _count: {
          books: (cat._count?.books || 0) + (cat._count?.digital_books || 0),
          digital_books: cat._count?.digital_books || 0,
        },
      })),
    [categoriesData],
  );
  const authors: Author[] = useMemo(() => (authorsData?.authors || []) as unknown as Author[], [authorsData]);

  /* Legacy URL param migration */
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    const legacyCategoryId = next.get("category_id");
    if (legacyCategoryId) {
      const m = categories.find((c) => c.id === legacyCategoryId);
      if (m && !next.get("category")) next.set("category", m.name);
      next.delete("category_id"); changed = true;
    }
    const legacyAuthorId = next.get("author_id");
    if (legacyAuthorId) {
      const m = authors.find((a) => a.id === legacyAuthorId);
      if (m && !next.get("author")) next.set("author", m.name);
      next.delete("author_id"); changed = true;
    }
    const legacyMinRating = next.get("min_rating");
    if (legacyMinRating) {
      if (!next.get("minRating")) next.set("minRating", legacyMinRating);
      next.delete("min_rating"); changed = true;
    }
    if (changed) router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [authors, categories, pathname, router, searchParams]);

  const selectedCategoryId = useMemo(() => {
    if (!selectedCategory) return "";
    const n = selectedCategory.trim().toLowerCase();
    return categories.find((c) => c.slug.toLowerCase() === n || c.name.toLowerCase() === n)?.id || "";
  }, [selectedCategory, categories]);

  const selectedAuthorId = useMemo(() => {
    if (!selectedAuthor) return "";
    return authors.find((a) => a.name.toLowerCase() === selectedAuthor.trim().toLowerCase())?.id || "";
  }, [selectedAuthor, authors]);

  const params = useMemo(() => {
    const p = new URLSearchParams({ limit: "24", sort: sortBy });
    if (selectedCategoryId) p.append("category_id", selectedCategoryId);
    if (selectedAuthorId) p.append("author_id", selectedAuthorId);
    if (availability) p.append("available", availability);
    if (minRating) p.append("min_rating", minRating);
    if (year) p.append("year", year);
    if (tags.trim()) p.append("tags", tags.trim());
    if (topics.trim()) p.append("topics", topics.trim());
    if (searchQuery.trim()) p.append("search", searchQuery.trim());
    return p.toString();
  }, [selectedCategoryId, selectedAuthorId, availability, minRating, year, tags, topics, searchQuery, sortBy]);

  const { data: physicalData, isLoading: physLoading } = useBooks(params);
  const { data: digitalData,  isLoading: digLoading  } = useDigitalBooks(params);

  const mergedBooks = useMemo(() => {
    const physical = ((physicalData?.books || []) as unknown as CatalogBook[]).map((b) => ({ ...b, type: "physical" as const }));
    const digital  = ((digitalData?.books  || []) as unknown as CatalogBook[]).map((b) => ({ ...b, type: "digital"  as const }));
    if (mode === "physical") return physical;
    if (mode === "digital")  return digital;
    return [...physical, ...digital];
  }, [physicalData, digitalData, mode]);

  const booksLoading  = physLoading || digLoading;
  const total         = mergedBooks.length;
  const totalPages    = Math.max(1, Math.ceil(total / limit));
  const pageToRender  = Math.min(page, totalPages);
  const start         = (pageToRender - 1) * limit;
  const books         = mergedBooks.slice(start, start + limit);
  const startIndex    = total === 0 ? 0 : start + 1;
  const endIndex      = Math.min(pageToRender * limit, total);
  const preservedQuery = searchParams.toString();

  useEffect(() => {
    if (page > totalPages) updateQuery({ page: String(totalPages) });
  }, [page, totalPages, updateQuery]);

  /* Observe when page header scrolls out — triggers sidebar search */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Observe when main filters section scrolls out — triggers sidebar filters */
  useEffect(() => {
    const el = filtersRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFiltersHidden(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasActiveFilters = Boolean(selectedAuthor || availability || minRating || year || tags || topics);

  const modeLabels: Record<CatalogMode, string> = {
    all:      t("books_page.modes.all")      as string,
    physical: t("books_page.modes.physical") as string,
    digital:  t("books_page.modes.digital")  as string,
  };

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-[#0d0d0d] flex flex-col">
      <Navbar />

      {/* ── Page header ─────────────────────────────────────── */}
      <div ref={headerRef} className="relative overflow-hidden" style={{ background: "rgba(14,12,10,0.72)" }}>
        {/* Faint background image */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url('/reading img 9.jpg')" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">
              {t("navbar.books") as string}
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white mb-6">
              {t("books_page.title") as string || "Explore the Collection"}
            </h1>
            <div className="max-w-2xl">
              <SearchBar onSearch={(q) => updateQuery({ search: q || null }, true)} />
            </div>
          </motion.div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-[#f8f7fc]" />
      </div>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8">
        {/* Outer flex row — min-height ensures sticky has room to work */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Sidebar ─── */}
          <div className="w-full lg:w-56 xl:w-60 shrink-0 self-start lg:sticky lg:top-[80px]">

            {/* ── Sticky search + filter bar — appears when page header scrolls away ── */}
            <AnimatePresence>
              {headerHidden && (
                <motion.div
                  key="sidebar-controls"
                  initial={{ opacity: 0, y: -16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.97 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="hidden lg:flex flex-col gap-2 mb-4"
                >
                  {/* Mini search — always shown when header hidden */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#e2e0e7] shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden"
                  >
                    <SearchBar onSearch={(q) => updateQuery({ search: q || null }, true)} />
                  </motion.div>

                  {/* Mode pills — always shown when header hidden */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.10, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#e2e0e7] shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-2"
                  >
                    <div className="flex items-center gap-1 rounded-xl bg-[#f1f0f4] p-1">
                      {(["all", "physical", "digital"] as CatalogMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => updateQuery({ mode: m }, true)}
                          className={`relative flex-1 rounded-lg py-1.5 text-[10px] font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] ${
                            mode === m ? "text-white" : "text-[#374151] hover:text-[#0d0d0d]"
                          }`}
                        >
                          {mode === m && (
                            <motion.span
                              layoutId="sidebar-mode-pill"
                              className="absolute inset-0 rounded-lg bg-[#0d0d0d]"
                              style={{ zIndex: -1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            />
                          )}
                          <span className="relative z-10">{modeLabels[m]}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Advanced filters — only shown when BOTH header AND filters section are hidden */}
                  <AnimatePresence>
                    {filtersHidden && (
                      <motion.div
                        key="sidebar-adv-filters"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ delay: 0.15, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#e2e0e7] shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden"
                      >
                        <button
                          onClick={() => setFiltersOpen(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-[#374151] hover:text-[#0d0d0d] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal size={13} />
                            {t("books_page.advanced_filters") as string || "Filters"}
                            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518]" />}
                          </div>
                          <motion.div animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
                            <ChevronDown size={12} />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {filtersOpen && (
                            <motion.div
                              key="sidebar-filters-body"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden border-t border-[#e2e0e7]"
                            >
                              <div className="px-4 py-3 flex flex-col gap-2.5">
                                {/* Author */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.all_authors") as string}</label>
                                  <div className="relative">
                                    <FilterSelect value={selectedAuthor} onChange={(e) => updateQuery({ author: e.target.value || null }, true)}>
                                      <option value="">{t("books_page.filters.all_authors") as string}</option>
                                      {authors.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                                    </FilterSelect>
                                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                                  </div>
                                </div>
                                {/* Availability */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.availability") as string}</label>
                                  <div className="relative">
                                    <FilterSelect value={availability} onChange={(e) => updateQuery({ availability: e.target.value || null }, true)}>
                                      <option value="">{t("books_page.filters.availability") as string}</option>
                                      <option value="true">{t("books_page.filters.available") as string}</option>
                                      <option value="false">{t("books_page.filters.unavailable") as string}</option>
                                    </FilterSelect>
                                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                                  </div>
                                </div>
                                {/* Min rating */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.min_rating_placeholder") as string}</label>
                                  <FilterInput type="number" min={1} max={5} step="0.1" value={minRating}
                                    onChange={(e) => updateQuery({ minRating: e.target.value || null }, true)} placeholder="e.g. 4" />
                                </div>
                                {/* Year */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.year_placeholder") as string}</label>
                                  <FilterInput type="number" value={year}
                                    onChange={(e) => updateQuery({ year: e.target.value || null }, true)} placeholder="e.g. 2023" />
                                </div>
                                {/* Tags */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.tags_placeholder") as string}</label>
                                  <FilterInput type="text" value={tags}
                                    onChange={(e) => updateQuery({ tags: e.target.value || null }, true)}
                                    placeholder={t("books_page.filters.tags_placeholder") as string} />
                                </div>
                                {/* Topics */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#374151] uppercase tracking-wider">{t("books_page.filters.topics_placeholder") as string}</label>
                                  <FilterInput type="text" value={topics}
                                    onChange={(e) => updateQuery({ topics: e.target.value || null }, true)}
                                    placeholder={t("books_page.filters.topics_placeholder") as string} />
                                </div>
                                {hasActiveFilters && (
                                  <button
                                    onClick={() => updateQuery({ author: null, availability: null, minRating: null, year: null, tags: null, topics: null }, true)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors self-start"
                                  >
                                    <X size={11} />
                                    Clear filters
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile: toggle button for categories */}
            <div className="flex lg:hidden mb-4">
              <button
                onClick={() => setMobileCatOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e2e0e7] bg-white text-sm font-bold text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-all"
              >
                <SlidersHorizontal size={16} />
                {t("books_page.filters_label") as string || "Filters"}
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#f5c518]" />
                )}
              </button>
            </div>

            {/* Sidebar — desktop: always visible; mobile: animated toggle */}
            <div className="hidden lg:block">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={(cat) => updateQuery({ category: cat }, true)}
                loading={categoriesLoading}
              />
            </div>

            <AnimatePresence>
              {mobileCatOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:hidden overflow-hidden mb-4"
                >
                  <div className="bg-white rounded-2xl border border-[#e2e0e7] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <CategorySidebar
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onCategoryChange={(cat) => { updateQuery({ category: cat }, true); setMobileCatOpen(false); }}
                      loading={categoriesLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Main content ─── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ── Top controls bar ─── */}
            <div className="bg-white rounded-2xl border border-[#e2e0e7] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Mode tabs */}
                <div className="flex items-center gap-1 rounded-xl bg-[#f1f0f4] p-1">
                  {(["all", "physical", "digital"] as CatalogMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateQuery({ mode: m }, true)}
                      className={`relative px-4 py-1.5 rounded-lg text-xs font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-1 ${
                        mode === m ? "text-white" : "text-[#374151] hover:text-[#0d0d0d]"
                      }`}
                    >
                      {mode === m && (
                        <motion.span
                          layoutId="mode-pill"
                          className="absolute inset-0 rounded-lg bg-[#0d0d0d]"
                          style={{ zIndex: -1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{modeLabels[m]}</span>
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <div className="relative ml-auto">
                  <FilterSelect
                    value={sortBy}
                    onChange={(e) => updateQuery({ sort: e.target.value }, true)}
                    className="pr-8 text-xs"
                  >
                    <option value="title">{t("books_page.sort_options.title_asc") as string}</option>
                    <option value="-title">{t("books_page.sort_options.title_desc") as string}</option>
                    <option value="-available">{t("books_page.sort_options.most_available") as string}</option>
                    <option value="available">{t("books_page.sort_options.least_available") as string}</option>
                    <option value="pages">{t("books_page.sort_options.shortest") as string}</option>
                    <option value="-pages">{t("books_page.sort_options.longest") as string}</option>
                  </FilterSelect>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ── Advanced filters ─── */}
            <div ref={filtersRef} className="bg-white rounded-2xl border border-[#e2e0e7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => setFiltersOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-[#374151] hover:text-[#0d0d0d] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} />
                  {t("books_page.advanced_filters") as string || "Advanced Filters"}
                  {hasActiveFilters && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5c518]/20 text-[#7a5c00] text-[10px] font-black">
                      Active
                    </span>
                  )}
                </div>
                <motion.div animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={15} />
                </motion.div>
              </button>

              <AnimatePresence>
                {filtersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 border-t border-[#e2e0e7]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                        {/* Author */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.all_authors") as string}
                          </label>
                          <div className="relative">
                            <FilterSelect
                              value={selectedAuthor}
                              onChange={(e) => updateQuery({ author: e.target.value || null }, true)}
                            >
                              <option value="">{t("books_page.filters.all_authors") as string}</option>
                              {authors.map((a) => (
                                <option key={a.id} value={a.name}>{a.name}</option>
                              ))}
                            </FilterSelect>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                          </div>
                        </div>

                        {/* Availability */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.availability") as string}
                          </label>
                          <div className="relative">
                            <FilterSelect
                              value={availability}
                              onChange={(e) => updateQuery({ availability: e.target.value || null }, true)}
                            >
                              <option value="">{t("books_page.filters.availability") as string}</option>
                              <option value="true">{t("books_page.filters.available") as string}</option>
                              <option value="false">{t("books_page.filters.unavailable") as string}</option>
                            </FilterSelect>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                          </div>
                        </div>

                        {/* Min rating */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.min_rating_placeholder") as string}
                          </label>
                          <FilterInput
                            type="number" min={1} max={5} step="0.1" value={minRating}
                            onChange={(e) => updateQuery({ minRating: e.target.value || null }, true)}
                            placeholder="e.g. 4"
                          />
                        </div>

                        {/* Year */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.year_placeholder") as string}
                          </label>
                          <FilterInput
                            type="number" value={year}
                            onChange={(e) => updateQuery({ year: e.target.value || null }, true)}
                            placeholder="e.g. 2023"
                          />
                        </div>

                        {/* Tags */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.tags_placeholder") as string}
                          </label>
                          <FilterInput
                            type="text" value={tags}
                            onChange={(e) => updateQuery({ tags: e.target.value || null }, true)}
                            placeholder={t("books_page.filters.tags_placeholder") as string}
                          />
                        </div>

                        {/* Topics */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">
                            {t("books_page.filters.topics_placeholder") as string}
                          </label>
                          <FilterInput
                            type="text" value={topics}
                            onChange={(e) => updateQuery({ topics: e.target.value || null }, true)}
                            placeholder={t("books_page.filters.topics_placeholder") as string}
                          />
                        </div>
                      </div>

                      {/* Clear filters */}
                      {hasActiveFilters && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => updateQuery({ author: null, availability: null, minRating: null, year: null, tags: null, topics: null }, true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                          >
                            <X size={13} />
                            Clear all filters
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Results count ─── */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#6b7280] font-medium">
                {booksLoading
                  ? t("books_page.status.loading") as string
                  : total > 0
                    ? t("books_page.status.showing", { start: startIndex, end: endIndex, total, mode: mode === "all" ? "" : `${modeLabels[mode]} ` }) as string
                    : t("books_page.status.no_books") as string}
              </p>
            </div>

            {/* ── Book grid ─── */}
            <BookCardGrid books={books} loading={booksLoading} listQuery={preservedQuery} />

            {/* ── Pagination ─── */}
            {totalPages > 1 && (
              <Pagination
                currentPage={pageToRender}
                totalPages={totalPages}
                onPageChange={(p) => updateQuery({ page: String(p) })}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f7fc]" />}>
      <BooksContent />
    </Suspense>
  );
}
