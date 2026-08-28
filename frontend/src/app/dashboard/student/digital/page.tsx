"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, fetchApi } from "@/lib/api";
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
type ApiResponse = { books: DigitalBook[]; meta?: { total?: number; totalPages?: number } };

const fadeUp: Variants  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const cardVar: Variants = { hidden: { opacity: 0, y: 12, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } };

export default function StudentDigitalPage() {
  const { t }  = useLanguage();
  const router = useRouter();
  const [page, setPage]          = useState(1);
  const [downloadingId, setDlId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<ApiResponse>({
    queryKey: ["digital-books", page],
    queryFn: () => fetchApi<ApiResponse>(`/digital-books?page=${page}&limit=18`),
    staleTime: 60_000,
    gcTime: 600_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const books      = Array.isArray(data?.books) ? data.books : [];
  const totalPages = Math.max(1, Number(data?.meta?.totalPages || 1));

  const handleRead = (book: DigitalBook) => {
    router.push(`/read/${book.id}`);
  };

  const handleDownload = async (book: DigitalBook) => {
    try {
      setDlId(book.id);
      const url  = `${API_BASE_URL}/digital-books/${book.id}/pdf?download=true`;
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) {
        const raw = await resp.text();
        let msg = `Error ${resp.status}`;
        try { msg = (JSON.parse(raw) as { message?: string }).message || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      if (blob.size === 0) throw new Error("File is empty.");
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl; a.download = `${book.title}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(objUrl), 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to download PDF.");
    } finally {
      setDlId(null);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-6">

      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Digital</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("digital_library.title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("digital_library.subtitle"))}</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[3/4] rounded-2xl bg-[#e8e4dc]" />
              <div className="h-3 bg-[#e8e4dc] rounded w-3/4" />
              <div className="h-2.5 bg-[#e8e4dc] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-12 text-center">
          <p className="text-sm text-[#0d0d0d]/35">{String(t("digital_library.none"))}</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {books.map(book => (
            <motion.div key={book.id} variants={cardVar} className="group flex flex-col">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#e8e4dc] mb-3">
                <Image
                  src={book.cover_image_url || "https://placehold.co/300x420?text=Book"}
                  alt={book.title} fill sizes="220px"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== "https://placehold.co/300x420?text=Book") {
                      target.srcset = "";
                      target.src = "https://placehold.co/300x420?text=Book";
                    }
                  }}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide ${
                  book.pdf_access === "RESTRICTED" ? "bg-[#0d0d0d]/70 text-white" : "bg-[#f5c518] text-[#0d0d0d]"
                }`}>
                  {book.pdf_access === "RESTRICTED" ? "Read only" : "Free"}
                </span>
              </div>

              <div className="flex-1 mb-3 px-0.5">
                <p className="text-[12px] font-bold text-[#0d0d0d] line-clamp-2 leading-tight">{book.title}</p>
                <p className="text-[10px] text-[#0d0d0d]/40 mt-0.5 truncate">
                  {book.author?.name || "Unknown"} · {book.category?.name || ""}
                </p>
              </div>

              <div className="flex gap-1.5 px-0.5">
                <button onClick={() => handleRead(book)}
                  className="flex-1 py-2 text-[10px] font-bold bg-[#0d0d0d] text-white rounded-xl hover:bg-[#292524] transition-colors">
                  {String(t("digital_library.read"))}
                </button>
                {book.pdf_access !== "RESTRICTED" && (
                  <button onClick={() => handleDownload(book)} disabled={downloadingId === book.id}
                    className="flex-1 py-2 text-[10px] font-bold bg-[#f5c518] text-[#0d0d0d] rounded-xl hover:bg-[#e8b000] disabled:opacity-50 transition-colors">
                    {downloadingId === book.id ? String(t("digital_library.preparing")) : String(t("digital_library.download"))}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between pb-6">
          <p className="text-[11px] text-[#0d0d0d]/35">
            {String(t("digital_library.page_info", { page, total: totalPages }))}
            {isFetching && " · updating…"}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1||isFetching}
              className="px-4 py-2 rounded-full text-[11px] font-bold border border-[#e8e4dc] text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              {String(t("digital_library.previous"))}
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages||isFetching}
              className="px-4 py-2 rounded-full text-[11px] font-bold bg-[#0d0d0d] text-white hover:bg-[#292524] disabled:opacity-30 transition-colors">
              {String(t("digital_library.next"))}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
