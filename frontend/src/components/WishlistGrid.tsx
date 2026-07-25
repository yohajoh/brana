"use client";
"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

type WishlistItem = {
  id: string;
  book_type: "PHYSICAL" | "DIGITAL";
  bookAvailable: boolean;
  bookDeleted: boolean;
  physical_book?: { id: string; title: string; cover_image_url: string; available: number; author: { name: string }; category: { name: string } } | null;
  digital_book?: { id: string; title: string; cover_image_url: string; pdf_access: string; author: { name: string }; category: { name: string } } | null;
};

type Props = {
  wishlist: WishlistItem[];
  loading?: boolean;
  filter: "all" | "physical" | "digital";
  onFilterChange: (f: "all" | "physical" | "digital") => void;
  onRemove: (id: string) => void;
};

export const WishlistGrid = ({ wishlist, loading, filter, onFilterChange, onRemove }: Props) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="aspect-[3/4] rounded-xl bg-[#e8e6e1]" />
            <div className="h-3 bg-[#e8e6e1] rounded w-3/4" />
            <div className="h-2.5 bg-[#e8e6e1] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-12 text-center space-y-3">
        <p className="text-sm text-[#0d0d0d]/40">{String(t("student_wishlist.empty_message"))}</p>
        <Link
          href="/books"
          className="inline-block px-6 py-2.5 rounded-full bg-[#0d0d0d] text-white text-xs font-bold hover:bg-[#1c1917] transition-colors"
        >
          {String(t("student_wishlist.browse_books"))}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(["all", "physical", "digital"] as const).map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              filter === f
                ? "bg-[#0d0d0d] text-white"
                : "bg-white border border-[#e8e6e1] text-[#0d0d0d]/50 hover:text-[#0d0d0d]"
            }`}
          >
            {String(t(`student_wishlist.filters.${f}`))}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {wishlist.map(item => {
          const book = item.physical_book || item.digital_book;
          if (!book) return null;

          return (
            <div key={item.id} className="group relative">
              <Link href={`/books/${book.id}`} className="block space-y-2">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#e8e6e1]">
                  <Image
                    src={book.cover_image_url || "/auth/image.png"}
                    alt={book.title}
                    fill
                    sizes="200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {item.bookDeleted && (
                    <div className="absolute inset-0 bg-[#0d0d0d]/70 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold text-center px-2">
                        {String(t("student_wishlist.status.no_longer_available"))}
                      </span>
                    </div>
                  )}
                  {!item.bookDeleted && (
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide ${
                      item.bookAvailable ? "bg-[#f5c518] text-[#0d0d0d]" : "bg-[#0d0d0d]/70 text-white"
                    }`}>
                      {item.bookAvailable
                        ? String(t("student_wishlist.status.available"))
                        : String(t("student_wishlist.status.unavailable"))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#0d0d0d] truncate leading-tight">{book.title}</p>
                  <p className="text-[10px] text-[#0d0d0d]/40 truncate">{book.author.name}</p>
                </div>
              </Link>

              <button
                onClick={() => onRemove(item.id)}
                aria-label="Remove from wishlist"
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              >
                <Trash2 size={12} className="text-red-500" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
