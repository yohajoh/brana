"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SearchBar } from "@/components/SearchBar";
import { BookCardGrid } from "@/components/BookCardGrid";
import { Pagination } from "@/components/Pagination";
import { useBooks, useDigitalBooks, useCategories, useAuthors } from "@/lib/hooks/useQueries";

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
  rating: { average: number; total: number; distribution?: { 1: number; 2: number; 3: number; 4: number; 5: number } };
  _count?: { rentals?: number; reviews?: number; wishlists?: number };
  type: "physical" | "digital";
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
};

export type Category = { id: string; name: string; slug: string; _count: { books: number; digital_books: number } };
type Author = { id: string; name: string };
type CatalogMode = "all" | "physical" | "digital";

export default function BooksPage() {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [mode, setMode] = useState<CatalogMode>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [availability, setAvailability] = useState<"" | "true" | "false">("");
  const [minRating, setMinRating] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [topics, setTopics] = useState<string>("");
  const limit = 12;

  const params = useMemo(() => {
    const p = new URLSearchParams({ limit: "24", sort: sortBy });
    if (selectedCategory) p.append("category_id", selectedCategory);
    if (selectedAuthor) p.append("author_id", selectedAuthor);
    if (availability) p.append("available", availability);
    if (minRating) p.append("min_rating", minRating);
    if (year) p.append("year", year);
    if (tags.trim()) p.append("tags", tags.trim());
    if (topics.trim()) p.append("topics", topics.trim());
    if (searchQuery.trim()) p.append("search", searchQuery.trim());
    return p.toString();
  }, [selectedCategory, selectedAuthor, availability, minRating, year, tags, topics, searchQuery, sortBy]);

  const { data: physicalData, isLoading: physicalLoading } = useBooks(params);
  const { data: digitalData, isLoading: digitalLoading } = useDigitalBooks(params);
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories("limit=50");
  const { data: authorsData } = useAuthors("limit=50");

  const categories: Category[] = (categoriesData?.categories || []) as unknown as Category[];
  const authors: Author[] = (authorsData?.authors || []) as unknown as Author[];

  const mergedBooks = useMemo(() => {
    const physicalBooks = ((physicalData?.books || []) as unknown as CatalogBook[]).map((b) => ({ ...b, type: "physical" as const }));
    const digitalBooks = ((digitalData?.books || []) as unknown as CatalogBook[]).map((b) => ({ ...b, type: "digital" as const }));

    if (mode === "physical") return physicalBooks;
    if (mode === "digital") return digitalBooks;
    return [...physicalBooks, ...digitalBooks];
  }, [physicalData, digitalData, mode]);

  const booksLoading = physicalLoading || digitalLoading;
  const total = mergedBooks.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageToRender = Math.min(page, totalPages);
  const start = (pageToRender - 1) * limit;
  const books = mergedBooks.slice(start, start + limit);

  const handleCategoryChange = (categoryId: string | null) => { setSelectedCategory(categoryId); setPage(1); };
  const handleSearch = (query: string) => { setSearchQuery(query); setPage(1); };
  const handleSortChange = (sort: string) => { setSortBy(sort); setPage(1); };

  const startIndex = total === 0 ? 0 : (pageToRender - 1) * limit + 1;
  const endIndex = Math.min(pageToRender * limit, total);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />
      <main className="grow mx-auto max-w-7xl w-full px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <CategorySidebar categories={categories} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} loading={categoriesLoading} />
          <div className="flex-1 space-y-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <SearchBar onSearch={handleSearch} />
              <div className="flex items-center gap-2 text-sm font-bold text-secondary">
                <span className="text-primary">Sort by:</span>
                <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)} className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary">
                  <option value="title">Title (A-Z)</option>
                  <option value="-title">Title (Z-A)</option>
                  <option value="-available">Most Available</option>
                  <option value="available">Least Available</option>
                  <option value="pages">Shortest</option>
                  <option value="-pages">Longest</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b border-border/50 pb-4">
              {(["all", "physical", "digital"] as CatalogMode[]).map((item) => (
                <button key={item} onClick={() => { setMode(item); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === item ? "bg-primary text-background" : "bg-muted/50 text-secondary hover:text-primary"}`}>
                  {item === "all" ? "All" : item === "physical" ? "Physical" : "Digital"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <p className="text-sm text-secondary font-medium">
                {booksLoading ? "Loading..." : total > 0 ? `Showing ${startIndex}-${endIndex} of ${total} ${mode === "all" ? "" : mode + " "}books` : "No books found"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <select value={selectedAuthor} onChange={(e) => { setSelectedAuthor(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-border bg-white text-sm">
                <option value="">All Authors</option>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={availability} onChange={(e) => { setAvailability(e.target.value as "" | "true" | "false"); setPage(1); }} className="px-3 py-2 rounded-xl border border-border bg-white text-sm">
                <option value="">Availability</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <input type="number" min={1} max={5} step="0.1" value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(1); }} placeholder="Min rating (e.g. 4)" className="px-3 py-2 rounded-xl border border-border bg-white text-sm" />
              <input type="number" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} placeholder="Publication year" className="px-3 py-2 rounded-xl border border-border bg-white text-sm" />
              <input type="text" value={tags} onChange={(e) => { setTags(e.target.value); setPage(1); }} placeholder="Tags (comma separated)" className="px-3 py-2 rounded-xl border border-border bg-white text-sm" />
              <input type="text" value={topics} onChange={(e) => { setTopics(e.target.value); setPage(1); }} placeholder="Topics (comma separated)" className="px-3 py-2 rounded-xl border border-border bg-white text-sm" />
            </div>
            <BookCardGrid books={books} loading={booksLoading} />
            {totalPages > 1 && <Pagination currentPage={pageToRender} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
