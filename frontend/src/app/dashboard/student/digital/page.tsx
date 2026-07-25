"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, fetchApi } from "@/lib/api";
import { LoadingCard } from "@/components/ui/Loading";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { toast } from "sonner";

type DigitalBook = {
  id: string;
  title: string;
  cover_image_url?: string;
  pdf_access: "FREE" | "PAID" | "RESTRICTED";
  author?: { name?: string };
  category?: { name?: string };
};

type ApiResponse = {
  books: DigitalBook[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
};

const toSlug = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

function DigitalLibraryContent() {
  const { t } = useLanguage();
  const [page, setPage]       = useState(1);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<ApiResponse>({
    queryKey: ["digital-books", "student-page", page],
    queryFn: () => fetchApi<ApiResponse>(`/digital-books?page=${page}&limit=20`),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const books      = Array.isArray(data?.books) ? data.books : [];
  const totalPages = Math.max(1, Number(data?.meta?.totalPages || 1));

  const openReader = async (book: DigitalBook, download = false) => {
    try {
      setOpeningId(book.id);
      const url      = `${API_BASE_URL}/digital-books/${book.id}/pdf${download ? "?download=true" : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const raw = await response.text();
        try { throw new Error((JSON.parse(raw) as { message?: string }).message || `Error ${response.status}`); }
        catch { throw new Error(`Error ${response.status}`); }
      }
      const blob = await response.blob();
      if (!response.headers.get("Content-Type")?.includes("application/pdf") || blob.size === 0)
        throw new Error("PDF file is empty or invalid.");
      const blobUrl = window.URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a");
        a.href = blobUrl; a.download = `${book.title}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to open this PDF.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-7 sm:px-6 lg:px-8 space-y-7">

      {/* Header */}
      <div>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Digital</p>
        <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">{String(t("digital_library.title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("digital_library.subtitle"))}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden animate-pulse">
              <div className="h-44 bg-[#f0eeea]" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-[#f0eeea] rounded w-3/4" />
                <div className="h-3 bg-[#f0eeea] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-12 text-center">
          <p className="text-sm text-[#0d0d0d]/35">{String(t("digital_library.none"))}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map(book => (
              <div key={book.id} className="group bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden hover:shadow-md transition-shadow">
                {/* Cover */}
                <div className="relative h-44 bg-[#f0eeea] overflow-hidden">
                  <Image
                    src={book.cover_image_url || "https://placehold.co/640x440?text=Book"}
                    alt={book.title}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${
                    book.pdf_access === "RESTRICTED"
                      ? "bg-[#0d0d0d]/70 text-white"
                      : "bg-[#f5c518] text-[#0d0d0d]"
                  }`}>
                    {book.pdf_access === "RESTRICTED" ? "Read Only" : "Download OK"}
                  </div>
                </div>
                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#0d0d0d] line-clamp-1">{book.title}</p>
                    <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">
                      {book.author?.name || "Unknown"} · {book.category?.name || "Uncategorized"}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/books/${toSlug(book.title)}?type=digital`}
                      className="flex-1 py-2 text-center text-[11px] font-bold text-[#0d0d0d]/50 border border-[#e8e6e1] rounded-lg hover:border-[#0d0d0d]/20 hover:text-[#0d0d0d] transition-colors"
                    >
                      {String(t("digital_library.details"))}
                    </Link>
                    <button
                      onClick={() => openReader(book)}
                      disabled={openingId === book.id}
                      className="flex-1 py-2 text-[11px] font-bold text-[#0d0d0d] bg-[#f5f4f0] border border-[#e8e6e1] rounded-lg hover:bg-[#ede9e3] transition-colors disabled:opacity-50"
                    >
                      {openingId === book.id ? String(t("digital_library.opening")) : String(t("digital_library.read"))}
                    </button>
                    {book.pdf_access !== "RESTRICTED" && (
                      <button
                        onClick={() => openReader(book, true)}
                        disabled={openingId === book.id}
                        className="flex-1 py-2 text-[11px] font-bold bg-[#0d0d0d] text-white rounded-lg hover:bg-[#292524] transition-colors disabled:opacity-50"
                      >
                        {openingId === book.id ? String(t("digital_library.preparing")) : String(t("digital_library.download"))}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pb-10">
            <p className="text-[11px] text-[#0d0d0d]/35">
              {String(t("digital_library.page_info", { page, total: totalPages }))}
              {isFetching && " · updating…"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="px-4 py-2 rounded-full text-[11px] font-bold border border-[#e8e6e1] text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"
              >
                {String(t("digital_library.previous"))}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                className="px-4 py-2 rounded-full text-[11px] font-bold bg-[#0d0d0d] text-white hover:bg-[#292524] disabled:opacity-30 transition-colors"
              >
                {String(t("digital_library.next"))}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentDigitalLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-12"><LoadingCard /></div>}>
      <DigitalLibraryContent />
    </Suspense>
  );
}
