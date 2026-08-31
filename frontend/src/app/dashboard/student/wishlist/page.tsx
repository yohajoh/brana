"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWishlist, useRemoveFromWishlist } from "@/lib/hooks/useQueries";
import { Pagination } from "@/components/Pagination";
import { useLanguage } from "@/components/providers/LanguageProvider";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.05}} };
const cardVar = { hidden:{opacity:0,scale:0.96,y:12}, show:{opacity:1,scale:1,y:0,transition:{duration:0.32,ease:[0.16,1,0.3,1]}} };

type WishlistItem = {
  id: string; book_type: "PHYSICAL"|"DIGITAL"; created_at: string;
  bookAvailable: boolean; bookDeleted: boolean;
  physical_book?: { id:string; title:string; cover_image_url:string; available:number; author:{name:string}; category:{name:string} } | null;
  digital_book?:  { id:string; title:string; cover_image_url:string; author:{name:string}; category:{name:string} } | null;
};

import { Search } from "lucide-react";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

export default function WishlistPage() {
  const { t }  = useLanguage();
  const [page, setPage]           = useState(1);
  const [filter, setFilter]       = useState<"all"|"physical"|"digital">("all");
  const [search, setSearch]       = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const limit = 12;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filter !== "all") params.append("book_type", filter.toUpperCase());

  const { data, isLoading, error, refetch: refetchWishlist } = useWishlist(params.toString());
  const remove = useRemoveFromWishlist();

  const wishlist: WishlistItem[] = (data?.wishlist || []) as unknown as WishlistItem[];
  const totalPages = data?.meta?.totalPages || 1;
  const available  = wishlist.filter(i => i.bookAvailable && !i.bookDeleted).length;

  const filteredWishlist = wishlist.filter(item => {
    const book = item.physical_book || item.digital_book;
    if (!book) return false;
    return (
      matchesMultiLangQuery(book.title, search) ||
      matchesMultiLangQuery(book.author?.name, search) ||
      matchesMultiLangQuery(book.category?.name, search)
    );
  });

  const toggleBulk = (id: string) => setBulkSelected(p => { const n = new Set(p); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  const allSelected = wishlist.length > 0 && wishlist.every(i => bulkSelected.has(i.id));
  const toggleAll = () => setBulkSelected(allSelected ? new Set() : new Set(wishlist.map(i => i.id)));

  const handleBulkRemove = async () => {
    if (!bulkSelected.size) return;
    setBulkRemoving(true);
    const ids = Array.from(bulkSelected);
    let success = 0;
    try {
      for (const id of ids) {
        await remove.mutateAsync(id);
        success++;
      }
      toast.success(`Removed ${success} item${success > 1 ? "s" : ""} from wishlist`);
      setBulkSelected(new Set());
      await refetchWishlist();
    } catch {
      if (success > 0) {
        toast.success(`Removed ${success} of ${ids.length} items`);
        await refetchWishlist();
      }
      toast.error(String(t("student_wishlist.failed_remove")));
    } finally { setBulkRemoving(false); }
  };

  const handleRemove = async (id: string) => {
    try   { await remove.mutateAsync(id); toast.success(String(t("student_wishlist.removed"))); }
    catch { toast.error(String(t("student_wishlist.failed_remove"))); }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-2 sm:p-4 lg:p-6 space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Collection</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("student_wishlist.title"))}</h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_wishlist.subtitle"))}</p>
        </div>
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={String(t("common.search") || "Search wishlist books…")} className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#e8e4dc] bg-white text-[#0d0d0d] placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d]" />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} className="grid grid-cols-3 gap-3">
        {[
          { label: String(t("student_wishlist.summary.total")),    value: wishlist.length },
          { label: String(t("student_wishlist.summary.available")), value: available, hi: available > 0 },
          { label: String(t("student_wishlist.summary.currently_unavailable")), value: wishlist.length - available - wishlist.filter(i=>i.bookDeleted).length },
        ].map(s => (
          <motion.div key={s.label} variants={fadeUp}
            className={`rounded-2xl border p-4 ${s.hi ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-[#e8e4dc]"}`}>
            <p className={`text-[24px] font-serif font-black leading-none ${s.hi ? "text-[#f5c518]" : "text-[#0d0d0d]"}`}>{s.value}</p>
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] mt-2 ${s.hi ? "text-white/40" : "text-[#0d0d0d]/35"}`}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error instanceof Error ? error.message : String(t("common.error_occurred"))}
        </motion.div>
      )}

      {/* Filter pills + select all */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
        {(["all","physical","digital"] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              filter === f ? "bg-[#0d0d0d] text-white" : "bg-white border border-[#e8e4dc] text-[#0d0d0d]/50 hover:text-[#0d0d0d]"
            }`}>
            {String(t(`student_wishlist.filters.${f}`))}
          </button>
        ))}
        {wishlist.length > 0 && (
          <button onClick={toggleAll}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#e8e4dc] text-[#0d0d0d]/50 hover:text-[#0d0d0d] transition-colors">
            <input type="checkbox" checked={allSelected} readOnly className="w-3.5 h-3.5 rounded accent-[#142b6f] pointer-events-none" />
            Select all
          </button>
        )}
      </motion.div>

      {/* Bulk bar */}
      {bulkSelected.size > 0 && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
          className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setBulkSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
              Clear
            </button>
            <button onClick={handleBulkRemove} disabled={bulkRemoving}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
              {bulkRemoving ? "Removing…" : `Remove ${bulkSelected.size}`}
            </button>
          </div>
        </motion.div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[3/4] rounded-2xl bg-[#e8e4dc]" />
              <div className="h-3 bg-[#e8e4dc] rounded w-3/4" />
              <div className="h-2.5 bg-[#e8e4dc] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredWishlist.length === 0 ? (
        <motion.div variants={fadeUp}
          className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-12 text-center space-y-4">
          <p className="text-sm text-[#0d0d0d]/35">{String(t("student_wishlist.empty_message"))}</p>
          <Link href="/books"
            className="inline-block px-6 py-2.5 rounded-full bg-[#0d0d0d] text-white text-xs font-bold hover:bg-[#292524] transition-colors">
            {String(t("student_wishlist.browse_books"))}
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredWishlist.map(item => {
            const book = item.physical_book || item.digital_book;
            if (!book) return null;
            return (
              <motion.div key={item.id} variants={cardVar} className="group relative">
                {/* Bulk select checkbox */}
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); toggleBulk(item.id); }}
                  className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    bulkSelected.has(item.id)
                      ? "opacity-100 bg-[#142b6f] shadow-md"
                      : "opacity-0 group-hover:opacity-100 bg-white/90 shadow-md"
                  }`}
                >
                  {bulkSelected.has(item.id) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <Link href={`/books/${book.id}`} className="block space-y-2">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#e8e4dc]">
                    <Image
                      src={book.cover_image_url || "/auth/image.png"}
                      alt={book.title} fill sizes="200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {item.bookDeleted && (
                      <div className="absolute inset-0 bg-[#0d0d0d]/70 flex items-center justify-center rounded-2xl">
                        <span className="text-white text-[9px] font-bold px-2 text-center">
                          {String(t("student_wishlist.status.no_longer_available"))}
                        </span>
                      </div>
                    )}
                    {!item.bookDeleted && (
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide ${
                        item.bookAvailable ? "bg-[#f5c518] text-[#0d0d0d]" : "bg-[#0d0d0d]/70 text-white"
                      }`}>
                        {item.bookAvailable
                          ? String(t("student_wishlist.status.available"))
                          : String(t("student_wishlist.status.unavailable"))}
                      </span>
                    )}
                  </div>
                  <div className="px-0.5">
                    <p className="text-[12px] font-bold text-[#0d0d0d] truncate leading-tight">{book.title}</p>
                    <p className="text-[10px] text-[#0d0d0d]/40 truncate">{book.author.name}</p>
                  </div>
                </Link>
                <button onClick={() => handleRemove(item.id)} aria-label="Remove"
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                  <Trash2 size={11} className="text-red-500" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="pb-10">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </motion.div>
      )}
    </motion.div>
  );
}
