"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useWishlist, useRemoveFromWishlist } from "@/lib/hooks/useQueries";
import { WishlistSummary } from "@/components/WishlistSummary";
import { WishlistGrid }   from "@/components/WishlistGrid";
import { Pagination }     from "@/components/Pagination";
import { useLanguage }    from "@/components/providers/LanguageProvider";

export type WishlistItem = {
  id: string;
  book_type: "PHYSICAL" | "DIGITAL";
  created_at: string;
  bookAvailable: boolean;
  bookDeleted: boolean;
  physical_book?: { id: string; title: string; cover_image_url: string; available: number; copies: number; pages: number; deleted_at: string | null; author: { id: string; name: string }; category: { id: string; name: string } } | null;
  digital_book?: { id: string; title: string; cover_image_url: string; pdf_access: string; pages: number; deleted_at: string | null; author: { id: string; name: string }; category: { id: string; name: string } } | null;
};

export default function WishlistPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "physical" | "digital">("all");
  const limit = 12;

  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (filter !== "all") params.append("book_type", filter);

  const { data, isLoading, error } = useWishlist(params.toString());
  const remove = useRemoveFromWishlist();

  const wishlist: WishlistItem[] = (data?.wishlist || []) as unknown as WishlistItem[];
  const totalPages = data?.meta?.totalPages || 1;

  const handleRemove = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(String(t("student_wishlist.removed")));
    } catch {
      toast.error(String(t("student_wishlist.failed_remove")));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-7 sm:px-6 lg:px-8 space-y-7">
      <div>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Collection</p>
        <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_wishlist.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_wishlist.subtitle"))}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error instanceof Error ? error.message : String(t("common.error_occurred"))}
        </div>
      )}

      <WishlistSummary wishlist={wishlist} loading={isLoading} />

      <div className="space-y-5 pb-10">
        <WishlistGrid
          wishlist={wishlist}
          loading={isLoading}
          filter={filter}
          onFilterChange={setFilter}
          onRemove={handleRemove}
        />
        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}
