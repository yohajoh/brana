"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Upload, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useBooks, useDigitalBooks, useCategories, useAuthors,
  useCreateBook, useUpdateBook, useDeleteBook,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateAuthor, useBookCopies, useConditionHistory, useUpdateCondition,
  useAddBookCopy, useDeleteBookCopy,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

type Tab = "all"|"physical"|"digital"|"categories";
const ITEMS = 10;
const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1] as const}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.06}} };
const modalIn = { hidden:{opacity:0,scale:0.97,y:16}, show:{opacity:1,scale:1,y:0,transition:{duration:0.28,ease:[0.16,1,0.3,1] as const}} };
const IC = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all placeholder:text-[#0d0d0d]/25";

interface Book {
  id:string; title:string; author_id?:string; category_id?:string;
  author?:{id:string;name:string}; category?:{id:string;name:string};
  copies?:number; total?:number; available?:number;
  cover_image_url?:string; images?:Array<{image_url:string}|string>;
  description?:string; publication_year?:number; loan_duration_days?:number|null;
  rental_price?:number; pages?:number; tags?:string[]; topics?:string[];
  pdf_access?:"FREE"|"PAID"|"RESTRICTED"; type?:"physical"|"digital";
}
interface Category { id:string; name:string; _count?:{books:number;digital_books?:number} }
interface Author   { id:string; name:string }
interface BookCopy { id:string; copy_code:string; condition:string; is_available:boolean; last_condition_update:string; notes?:string|null }
interface CondHist  { id:string; old_condition:string; new_condition:string; notes?:string|null; created_at:string }

/* ── Confirm dialog (reusable) ─────────────────────────── */
function Confirm({ title, desc, confirmLabel, tone, onClose, onConfirm, loading }:
  { title:string; desc:string; confirmLabel:string; tone:"danger"|"primary"; onClose:()=>void; onConfirm:()=>Promise<void>; loading:boolean }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  const btnCls = tone==="danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#0d0d0d] hover:bg-[#292524] text-white";
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[2147483647] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={()=>!busy&&!loading&&onClose()}>
      <motion.div variants={modalIn} initial="hidden" animate="show"
        className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl"
        onClick={e=>e.stopPropagation()}>
        <h3 className="text-[17px] font-serif font-black text-[#0d0d0d] mb-2">{title}</h3>
        <p className="text-sm text-[#0d0d0d]/55 leading-relaxed mb-6">{desc}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={busy||loading}
            className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={go} disabled={busy||loading}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors ${btnCls}`}>
            {busy||loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

/* ── Searchable dropdown with Quick Add sub-modal trigger ───────── */
function SearchDropdown({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  onOpenQuickModal,
}: {
  label: string;
  placeholder: string;
  options: { id: string; name: string }[];
  selectedId: string;
  onSelect: (o: { id: string; name: string }) => void;
  onOpenQuickModal: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const sel = options.find((o) => o.id === selectedId);
  const filtered = options.filter((o) => matchesMultiLangQuery(o.name, q));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">
          {label} *
        </label>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onOpenQuickModal();
          }}
          className="text-[11px] font-bold text-[#142b6f] hover:underline flex items-center gap-1"
        >
          <Plus size={12} />
          <span>Add New {label}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQ("");
        }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-left hover:bg-white focus:outline-none focus:border-[#0d0d0d] transition-all"
      >
        <span className={sel ? "text-[#0d0d0d] font-bold" : "text-[#0d0d0d]/30"}>
          {sel?.name || placeholder}
        </span>
        <ChevronDown size={14} className={`text-[#0d0d0d]/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden"
          >
            <div className="p-2.5 border-b border-[#e8e4dc]">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e8e4dc] focus:outline-none focus:border-[#0d0d0d] bg-[#f5f4f0] focus:bg-white transition-all"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[#0d0d0d]/35">No matches found</p>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onSelect(o);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedId === o.id
                        ? "bg-[#0d0d0d] text-white font-bold"
                        : "text-[#0d0d0d] hover:bg-[#f5f4f0]"
                    }`}
                  >
                    {o.name}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Quick Sub-Modal for Author ───────── */
function QuickAuthorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (author: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imgPreview, setPreview] = useState<string | null>(null);
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);
  const [authorFile, setAuthorFile] = useState<File | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPct, setImgPct] = useState(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const createAuthor = useCreateAuthor();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setAuthorFile(file);
    setImgUploading(true);
    setImgPct(0);
    try {
      const [url] = await uploadViaXHR([file], "brana/authors", setImgPct);
      setUploadedImgUrl(url);
    } catch {
      // If direct upload fails, fallback to sending raw File in FormData
    } finally {
      setImgUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || imgUploading) return;
    const fd = new FormData();
    fd.append("name", name.trim());

    // Backend authorService requires bio >= 10 characters
    const finalBio = bio.trim().length >= 10
      ? bio.trim()
      : `${name.trim()} is a distinguished author in the Brana library catalog.`;
    fd.append("bio", finalBio);

    // Backend authorService requires image (File or URL string)
    if (authorFile) {
      fd.append("image", authorFile);
    } else if (uploadedImgUrl) {
      fd.append("image", uploadedImgUrl);
    } else {
      fd.append("image", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400");
    }

    try {
      const res = await createAuthor.mutateAsync(fd);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = (res as any)?.data?.author || (res as any)?.author;
      const createdId = created?.id || `temp-${Date.now()}`;
      const createdName = created?.name || name.trim();
      onCreated({ id: createdId, name: createdName });
      toast.success(`Author "${createdName}" saved to database!`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create author");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483648] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !imgUploading) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#e8e4dc]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc]">
          <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">Add New Author</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d]"
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">
              Author Name *
            </label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter author full name"
              className={IC}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">
              Bio / Description
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief biography (optional)"
              className={`${IC} resize-none`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">
              Author Photo (Optional)
            </label>
            <div
              onClick={() => {
                if (!imgUploading) imgRef.current?.click();
              }}
              className={`relative w-full h-24 rounded-xl border-2 border-dashed overflow-hidden cursor-pointer flex items-center justify-center gap-2 text-xs transition-colors ${
                imgUploading
                  ? "border-[#f5c518] bg-amber-50"
                  : imgPreview
                  ? "border-emerald-400"
                  : "border-[#e8e4dc] hover:border-[#0d0d0d]/30 text-[#0d0d0d]/40"
              }`}
            >
              {imgPreview ? (
                <>
                  <Image src={imgPreview} alt="author preview" fill className="object-cover" unoptimized />
                  {imgUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                      Uploading {imgPct}%…
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload Image
                </>
              )}
            </div>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-xs font-bold text-[#0d0d0d]/60 hover:bg-[#f5f4f0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAuthor.isPending || imgUploading || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors"
            >
              {createAuthor.isPending ? "Saving to database…" : "Save Author"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Quick Sub-Modal for Category ───────── */
function QuickCategoryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (cat: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const createCategory = useCreateCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await createCategory.mutateAsync({ name: name.trim() });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = (res as any)?.data?.category || (res as any)?.category;
      const createdId = created?.id || `temp-${Date.now()}`;
      const createdName = created?.name || name.trim();
      onCreated({ id: createdId, name: createdName });
      toast.success(`Category "${createdName}" saved to database!`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483648] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-[#e8e4dc]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc]">
          <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">Add New Category</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d]"
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">
              Category Name *
            </label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Science Fiction, History"
              className={IC}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-xs font-bold text-[#0d0d0d]/60 hover:bg-[#f5f4f0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCategory.isPending || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors"
            >
              {createCategory.isPending ? "Saving to database…" : "Save Category"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── XHR upload helper (real byte-level progress) ──────── */
async function uploadViaXHR(
  files: File[],
  folder: string,
  onProgress: (pct: number) => void,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const urls: string[] = res?.data?.urls ?? [];
          if (!urls.length) { reject(new Error("No URLs returned")); return; }
          onProgress(100);
          resolve(urls);
        } catch { reject(new Error("Invalid server response")); }
      } else {
        let msg = "Upload failed";
        try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch { /* */ }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    xhr.open("POST", `${base}/media/upload?folder=${encodeURIComponent(folder)}`);
    xhr.withCredentials = true;
    xhr.send(fd);
  });
}

/* ── Add/Edit Book Modal ────────────────────────────────── */
function BookModal({ onClose, authors, categories, editingBook, onSubmit, submitting }:
  { onClose:()=>void; authors:Author[]; categories:Category[]; editingBook:Book|null;
    onSubmit:(type:"physical"|"digital",data:FormData)=>Promise<void>; submitting:boolean }) {
  const { t } = useLanguage();
  const [type, setType] = useState<"physical"|"digital">(editingBook?.type==="digital"?"digital":"physical");
  const [form, setForm] = useState({ title:"", author_id:"", category_id:"", copies:"", pages:"",
    description:"", publication_year:"", loan_duration_days:"", rental_price:"10",
    tags:"", topics:"", pdf_access:"RESTRICTED" as "FREE"|"PAID"|"RESTRICTED" });
  // Pre-uploaded Cloudinary URLs
  const [coverUrl, setCoverUrl]   = useState<string>(editingBook?.cover_image_url||"");
  const [coverFile, setCoverFile] = useState<File|null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editingBook?.images ? (editingBook.images as any[]).map((i)=>i.image_url||i) : []
  );
  // Upload progress
  const [coverUploading,   setCoverUploading]   = useState(false);
  const [coverPct,         setCoverPct]         = useState(0);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryPct,       setGalleryPct]       = useState(0);
  // PDF still sent as raw file (stored in DB as bytes)
  const [pdfFile, setPdfFile] = useState<File|null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const isUploading = coverUploading || galleryUploading;

  // Manage locally created entities so they are instantly visible & selected in the modal dropdown
  const [createdAuthors, setCreatedAuthors]       = useState<Author[]>([]);
  const [createdCategories, setCreatedCategories] = useState<Category[]>([]);
  const [showQuickAuthorModal, setShowQuickAuthorModal]     = useState(false);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);

  const allAuthors    = [...createdAuthors, ...authors];
  const allCategories = [...createdCategories, ...categories];

  useEffect(() => {
    if (!editingBook) return;
    const timer = setTimeout(()=>{
      setType(editingBook.type==="digital"?"digital":"physical");
      setForm({
        title: editingBook.title||"", author_id: editingBook.author_id||editingBook.author?.id||"",
        category_id: editingBook.category_id||editingBook.category?.id||"",
        copies: String(editingBook.copies??editingBook.total??""), pages: String(editingBook.pages??""),
        description: editingBook.description||"", publication_year: String(editingBook.publication_year??""),
        loan_duration_days: String(editingBook.loan_duration_days??""), rental_price: String(editingBook.rental_price??10),
        tags: Array.isArray(editingBook.tags)?editingBook.tags.join(", "):"",
        topics: Array.isArray(editingBook.topics)?editingBook.topics.join(", "):"",
        pdf_access: editingBook.pdf_access||"RESTRICTED",
      });
    },0);
    return ()=>clearTimeout(timer);
  },[editingBook]);

  const f = (k:string) => (v:string) => setForm(p=>({...p,[k]:v}));

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
    setCoverUploading(true); setCoverPct(0);
    try {
      const folder = type==="digital" ? "brana/digital-books/covers" : "brana/physical-books/covers";
      const [url] = await uploadViaXHR([file], folder, setCoverPct);
      setCoverUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover upload failed");
    } finally { setCoverUploading(false); if (imgRef.current) imgRef.current.value = ""; }
  };

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files||[]); if (!files.length) return;
    setGalleryUploading(true); setGalleryPct(0);
    try {
      const folder = type==="digital" ? "brana/digital-books/gallery" : "brana/physical-books/gallery";
      const urls = await uploadViaXHR(files, folder, setGalleryPct);
      setGalleryUrls(prev=>[...prev,...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gallery upload failed");
    } finally { setGalleryUploading(false); if (galRef.current) galRef.current.value = ""; }
  };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); if (isUploading) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k,v])=>{ if(v!=="") fd.append(k,String(v)); });

    if (coverFile) {
      fd.append("image", coverFile);
    }
    if (coverUrl && !coverUrl.startsWith("blob:")) {
      fd.append("cover_image_url", coverUrl);
    }

    galleryUrls.forEach(url=>{ if(!url.startsWith("blob:")) fd.append("gallery_urls", url); });
    if (pdfFile) fd.append("pdf", pdfFile);
    await onSubmit(type, fd);
  };

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
        onClick={e=>{ if(e.target===e.currentTarget && !isUploading) onClose(); }}>
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
          transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
          className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
          onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc] shrink-0">
            <h2 className="text-[16px] font-serif font-black text-[#0d0d0d]">
              {editingBook ? String(t("admin_books.modal.edit_title")) : String(t("admin_books.modal.add_title"))}
            </h2>
            <button onClick={onClose} disabled={isUploading} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] disabled:opacity-40 transition-colors">
              <X size={15}/>
            </button>
          </div>
          {/* Type tabs */}
          {!editingBook && (
            <div className="flex gap-1 p-3 border-b border-[#e8e4dc] shrink-0">
              {(["physical","digital"] as const).map(tp=>(
                <button key={tp} type="button" onClick={()=>{ if(!isUploading) setType(tp); }} disabled={isUploading}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 ${type===tp?"bg-[#0d0d0d] text-white":"text-[#0d0d0d]/50 hover:text-[#0d0d0d]"}`}>
                  {tp==="physical"?"Physical":"Digital"}
                </button>
              ))}
            </div>
          )}
          {/* Body */}
          <form id="book-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.title"))} *</label>
              <input required value={form.title} onChange={e=>f("title")(e.target.value)} className={IC} placeholder="Book title"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchDropdown
                label={String(t("admin_books.modal.labels.author"))}
                placeholder={String(t("admin_books.modal.placeholders.author"))}
                options={allAuthors}
                selectedId={form.author_id}
                onSelect={(o) => f("author_id")(o.id)}
                onOpenQuickModal={() => setShowQuickAuthorModal(true)}
              />
              <SearchDropdown
                label={String(t("admin_books.modal.labels.category"))}
                placeholder={String(t("admin_books.modal.placeholders.category"))}
                options={allCategories}
                selectedId={form.category_id}
                onSelect={(o) => f("category_id")(o.id)}
                onOpenQuickModal={() => setShowQuickCategoryModal(true)}
              />
            </div>
          {type==="physical" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["copies",t("admin_books.modal.labels.copies")],["pages",t("admin_books.modal.labels.pages")],
                ["rental_price",t("admin_books.modal.labels.rental_price")],["loan_duration_days",t("admin_books.modal.labels.loan_duration")]].map(([k,lb])=>(
                <div key={k as string} className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(lb)}</label>
                  <input type="number" value={form[k as keyof typeof form] as string} onChange={e=>f(k as string)(e.target.value)} className={IC}/>
                </div>
              ))}
            </div>
          )}
          {type==="digital" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.pdf_access"))}</label>
              <select value={form.pdf_access} onChange={e=>f("pdf_access")(e.target.value)} className={IC}>
                <option value="RESTRICTED">Restricted (Read Only)</option>
                <option value="FREE">Free (Download Allowed)</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.description"))}</label>
            <textarea rows={3} value={form.description} onChange={e=>f("description")(e.target.value)} className={`${IC} resize-none`}/>
          </div>
          {/* Cover image */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.cover_image"))}</label>
            <div onClick={()=>{ if(!coverUploading) imgRef.current?.click(); }}
              className={`relative w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors
                ${coverUploading?"border-[#f5c518] bg-amber-50":coverUrl&&!coverUrl.startsWith("blob:")?"border-emerald-400":"border-[#e8e4dc] hover:border-[#0d0d0d]/30"}
                ${coverUrl?"h-44":"h-24 flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:text-[#0d0d0d]/70"}`}>
              {coverUrl ? (
                <>
                  <Image src={coverUrl} alt="Cover" fill className="object-cover" unoptimized/>
                  {coverUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 p-4">
                      <div className="w-full bg-white/30 rounded-full h-1.5"><div className="bg-[#f5c518] h-1.5 rounded-full transition-all" style={{width:`${coverPct}%`}}/></div>
                      <span className="text-white text-[12px] font-bold">{coverPct}%</span>
                    </div>
                  )}
                  {!coverUploading && (
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                      <span className="text-white text-[12px] font-bold bg-black/60 px-3 py-1.5 rounded-lg"><Upload size={12} className="inline mr-1"/>Replace</span>
                    </div>
                  )}
                </>
              ) : coverUploading ? (
                <div className="w-full px-6 space-y-2">
                  <div className="w-full bg-[#e8e4dc] rounded-full h-1.5"><div className="bg-[#f5c518] h-1.5 rounded-full transition-all" style={{width:`${coverPct}%`}}/></div>
                  <p className="text-center text-[12px] font-bold text-[#0d0d0d]/60">Uploading… {coverPct}%</p>
                </div>
              ) : (
                <><Upload size={16}/>{String(t("admin_books.modal.drop_image"))}</>
              )}
            </div>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverChange}/>
          </div>
          {type==="digital" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.pdf_file"))}</label>
              <button type="button" onClick={()=>pdfRef.current?.click()} disabled={isUploading}
                className="w-full h-24 rounded-xl border-2 border-dashed border-[#e8e4dc] flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d]/70 disabled:opacity-50 transition-colors">
                <Upload size={16}/>{pdfFile ? pdfFile.name : String(t("admin_books.modal.drop_pdf"))}
              </button>
              <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={e=>setPdfFile(e.target.files?.[0]||null)}/>
            </div>
          )}
          {/* Gallery */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.book_gallery"))}</label>
            <div className="rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] p-3 space-y-3">
              {galleryUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {galleryUrls.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e8e4dc] group bg-white shrink-0">
                      <Image src={url} alt={`Gallery ${idx+1}`} fill className="object-cover" unoptimized/>
                      <button type="button" onClick={()=>setGalleryUrls(p=>p.filter((_,i)=>i!==idx))} disabled={galleryUploading}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:hidden">
                        <X size={14} className="text-white"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {galleryUploading && (
                <div className="space-y-1">
                  <div className="w-full bg-[#e8e4dc] rounded-full h-1.5"><div className="bg-[#0d0d0d] h-1.5 rounded-full transition-all" style={{width:`${galleryPct}%`}}/></div>
                  <p className="text-[11px] font-bold text-[#0d0d0d]/50">Uploading gallery… {galleryPct}%</p>
                </div>
              )}
              <button type="button" onClick={()=>{ if(!galleryUploading) galRef.current?.click(); }} disabled={galleryUploading}
                className="w-full h-12 rounded-xl border-2 border-dashed border-[#e8e4dc] flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d]/60 disabled:opacity-50 bg-white transition-colors">
                <Upload size={15}/>
                {galleryUploading ? `Uploading… ${galleryPct}%` : galleryUrls.length > 0 ? "Add more images" : String(t("admin_books.modal.drop_gallery"))}
              </button>
              <input ref={galRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryChange}/>
            </div>
          </div>
        </form>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#e8e4dc] shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#0d0d0d]/40 truncate">
            {coverUploading ? `Uploading cover… ${coverPct}%` : galleryUploading ? `Uploading gallery… ${galleryPct}%`
              : coverUrl&&!coverUrl.startsWith("blob:") ? "✓ Cover ready" : ""}
          </span>
          <div className="flex gap-3 shrink-0">
            <button type="button" onClick={onClose} disabled={isUploading}
              className="px-5 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] disabled:opacity-40 transition-colors">
              Cancel
            </button>
            <button type="submit" form="book-form" disabled={submitting||isUploading}
              className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
              {isUploading ? (coverUploading?`Cover ${coverPct}%…`:`Gallery ${galleryPct}%…`)
                : submitting ? (editingBook?String(t("admin_books.modal.submitting_update")):String(t("admin_books.modal.submitting_add")))
                : (editingBook?String(t("admin_books.modal.submit_update")):String(t("admin_books.modal.submit_add")))}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>

      <AnimatePresence>
        {showQuickAuthorModal && (
          <QuickAuthorModal
            onClose={() => setShowQuickAuthorModal(false)}
            onCreated={(author) => {
              setCreatedAuthors((prev) => [author, ...prev.filter((a) => a.id !== author.id)]);
              f("author_id")(author.id);
            }}
          />
        )}
        {showQuickCategoryModal && (
          <QuickCategoryModal
            onClose={() => setShowQuickCategoryModal(false)}
            onCreated={(cat) => {
              setCreatedCategories((prev) => [cat, ...prev.filter((c) => c.id !== cat.id)]);
              f("category_id")(cat.id);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Condition Modal ────────────────────────────────────── */
function ConditionModal({ bookId, title, onClose }: { bookId: string; title: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null);
  const [newCond, setNewCond] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addCopyCode, setAddCopyCode] = useState("");
  const [addCond, setAddCond] = useState("NEW");
  const [addStatus, setAddStatus] = useState("AVAILABLE");
  const [addNotes, setAddNotes] = useState("");

  const { data: copiesData } = useBookCopies(bookId);
  const { data: historyData } = useConditionHistory(selectedCopy?.id || "");
  const update = useUpdateCondition();
  const addCopy = useAddBookCopy();
  const deleteCopy = useDeleteBookCopy();

  const copies: BookCopy[] = copiesData?.data?.copies || [];
  const history: CondHist[] = historyData?.data?.history || [];

  const CONDITIONS = ["NEW", "GOOD", "WORN", "DAMAGED", "LOST"];
  const STATUSES = ["AVAILABLE", "BORROWED", "UNDER_INSPECTION", "DAMAGED_REPAIR", "DECOMMISSIONED", "LOST"];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCopy || (!newCond && !newStatus)) return;
    try {
      await update.mutateAsync({
        copyId: selectedCopy.id,
        data: { condition: newCond || undefined, status: newStatus || undefined, notes: notes || undefined },
      });
      toast.success("Copy condition & status updated");
      setSelectedCopy(null);
      setNewCond("");
      setNewStatus("");
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update copy");
    }
  };

  const handleAddCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCopy.mutateAsync({
        bookId,
        data: {
          copy_code: addCopyCode || undefined,
          condition: addCond,
          status: addStatus,
          notes: addNotes || undefined,
        },
      });
      toast.success("New physical book copy registered");
      setShowAddForm(false);
      setAddCopyCode("");
      setAddCond("NEW");
      setAddStatus("AVAILABLE");
      setAddNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add copy");
    }
  };

  const handleDeleteCopy = async (copyId: string, copyCode: string) => {
    if (!confirm(`Are you sure you want to decommission/delete physical copy "${copyCode}"?`)) return;
    try {
      await deleteCopy.mutateAsync({ copyId, bookId });
      toast.success(`Copy ${copyCode} removed from active inventory`);
      if (selectedCopy?.id === copyId) setSelectedCopy(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete copy");
    }
  };

  const getStatusBadgeClass = (st?: string) => {
    switch (st) {
      case "AVAILABLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "BORROWED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_INSPECTION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DAMAGED_REPAIR":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "LOST":
      case "DECOMMISSIONED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e4dc] shrink-0 bg-[#faf9f6]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#142b6f]" />
              <h2 className="text-[16px] font-serif font-black text-[#0d0d0d]">Physical Copy Inventory Management</h2>
            </div>
            <p className="text-[12px] text-[#0d0d0d]/50 truncate max-w-md">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header & Add Copy Action */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-[0.18em]">
              Physical Copies Matrix ({copies.length})
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142b6f] text-white text-[11px] font-bold hover:bg-[#0e1f52] transition-colors"
            >
              <Plus size={13} />
              {showAddForm ? "Cancel Add" : "Add Physical Copy"}
            </button>
          </div>

          {/* New Copy Form */}
          {showAddForm && (
            <form onSubmit={handleAddCopySubmit} className="p-4 bg-[#f0f4ff] rounded-xl border border-[#142b6f]/20 space-y-3">
              <p className="text-[11px] font-extrabold text-[#142b6f] uppercase tracking-wider">
                Register New Copy
              </p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Code (Auto e.g. BC-001)"
                  value={addCopyCode}
                  onChange={(e) => setAddCopyCode(e.target.value)}
                  className={IC}
                />
                <select value={addCond} onChange={(e) => setAddCond(e.target.value)} className={IC}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select value={addStatus} onChange={(e) => setAddStatus(e.target.value)} className={IC}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Initial notes / shelf location..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className={IC}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addCopy.isPending}
                  className="px-4 py-2 bg-[#142b6f] text-white rounded-xl text-xs font-bold hover:bg-[#0e1f52] transition-colors"
                >
                  {addCopy.isPending ? "Creating..." : "Save Copy"}
                </button>
              </div>
            </form>
          )}

          {/* Physical Copies Matrix */}
          <div className="space-y-2">
            {copies.length === 0 ? (
              <p className="text-sm text-[#0d0d0d]/35">No copies logged for this book.</p>
            ) : (
              copies.map((c: any) => {
                const activeRental = c.rentals?.[0];
                return (
                  <div
                    key={c.id}
                    className={`w-full flex flex-col p-4 rounded-xl border transition-all ${
                      selectedCopy?.id === c.id
                        ? "border-[#142b6f] bg-[#f0f4ff] shadow-sm"
                        : "border-[#e8e4dc] bg-white hover:border-[#0d0d0d]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCopy(c);
                          setNewCond(c.condition);
                          setNewStatus(c.status || (c.is_available ? "AVAILABLE" : "BORROWED"));
                          setNotes(c.notes || "");
                        }}
                        className="flex items-center gap-2 text-left"
                      >
                        <span className="text-[14px] font-extrabold text-[#0d0d0d] font-mono">{c.copy_code}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f4f0] text-[#0d0d0d]/70">
                          {c.condition}
                        </span>
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadgeClass(
                            c.status || (c.is_available ? "AVAILABLE" : "BORROWED"),
                          )}`}
                        >
                          {c.status || (c.is_available ? "AVAILABLE" : "BORROWED")}
                        </span>
                        
                        {!activeRental && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCopy(c.id, c.copy_code)}
                            title="Delete physical copy"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Custody Info */}
                    {activeRental && activeRental.user && (
                      <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-[#0d0d0d]/60">
                        <span>
                          Current Custody: <strong>{activeRental.user.name}</strong> ({activeRental.user.email})
                        </span>
                        <span>Due: {new Date(activeRental.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Edit Selected Copy Form */}
          {selectedCopy && (
            <form onSubmit={handleUpdate} className="space-y-4 bg-[#f8f7f4] rounded-xl p-5 border border-[#e8e4dc]">
              <div className="flex items-center justify-between border-b border-[#e8e4dc] pb-2">
                <p className="text-[11px] font-black text-[#142b6f] uppercase tracking-wider">
                  Update Copy Status & Condition: <span className="font-mono">{selectedCopy.copy_code}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">
                    Physical Condition
                  </label>
                  <select value={newCond} onChange={(e) => setNewCond(e.target.value)} required className={IC}>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">
                    Inventory Status
                  </label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required className={IC}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">
                  Audit Notes & Maintenance Reason
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for status change or condition audit..."
                  className={`${IC} resize-none`}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCopy(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#e8e4dc] text-[12px] font-bold text-[#0d0d0d]/70 hover:bg-[#f5f4f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={update.isPending}
                  className="px-5 py-2 rounded-xl bg-[#142b6f] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#0e1f52] transition-colors"
                >
                  {update.isPending ? "Saving..." : "Save Audit Record"}
                </button>
              </div>
            </form>
          )}

          {/* Condition History Trace */}
          {history.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-[0.18em] mb-3">
                Condition & Custody Audit History ({selectedCopy?.copy_code})
              </p>
              <div className="space-y-2">
                {history.slice(0, 15).map((h: any) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between p-3.5 bg-white rounded-xl border border-[#e8e4dc]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#0d0d0d]">
                          {h.old_condition || "N/A"} → {h.new_condition}
                        </span>
                        {h.old_status && h.new_status && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {h.old_status} → {h.new_status}
                          </span>
                        )}
                      </div>
                      {h.notes && <p className="text-[11px] text-[#0d0d0d]/60">{h.notes}</p>}
                      <p className="text-[10px] text-[#0d0d0d]/40">
                        Logged by: {h.updated_by_user?.name || "System"} •{" "}
                        {new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function AdminBooksPage() {
  const { t } = useLanguage();
  const [tab, setTab]                 = useState<Tab>("all");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [showBook, setShowBook]       = useState(false);
  const [editing, setEditing]         = useState<Book|null>(null);
  const [deleteCandidate, setDel]     = useState<{id:string;type:"physical"|"digital";title:string}|null>(null);
  const [condBook, setCondBook]       = useState<{id:string;title:string}|null>(null);
  const [openMenu, setOpenMenu]       = useState<string|null>(null);
  const [showCatModal, setShowCat]    = useState(false);
  const [editCatId, setEditCatId]     = useState<string|null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [catName, setCatName]         = useState("");
  const [delCat, setDelCat]           = useState<{id:string;name:string}|null>(null);

  const { data: booksData,    isLoading: bl, refetch: refetchBooks }   = useBooks("limit=200");
  const { data: digitalData,  isLoading: dl, refetch: refetchDigital } = useDigitalBooks("limit=200");
  const { data: catsData,     isLoading: cl }    = useCategories("limit=200");
  const { data: authorsData }                 = useAuthors("limit=200");

  const createBook = useCreateBook(); const updateBook = useUpdateBook(); const deleteBook = useDeleteBook();
  const createCat  = useCreateCategory(); const updateCat = useUpdateCategory(); const deleteCat = useDeleteCategory();

  const physical: Book[] = (booksData?.books||[]).map((b:Book)=>({...b,type:"physical" as const,total:b.copies??b.total}));
  const digital:  Book[] = (digitalData?.books||[]).map((b:Book)=>({...b,type:"digital" as const,total:0}));
  const cats:     Category[] = catsData?.categories||[];
  const authors:  Author[]   = authorsData?.authors||[];

  const loading = bl||dl||cl;
  const err = (e:unknown,fb:string) => e instanceof Error&&e.message?e.message:fb;

  useEffect(()=>{ const h=()=>setOpenMenu(null); window.addEventListener("click",h); return()=>window.removeEventListener("click",h); },[]);

  const allBooks = [...physical,...digital];
  const source   = tab==="all"?allBooks:tab==="physical"?physical:digital;
  const filtered = source.filter(b=>!search.trim()||(
    matchesMultiLangQuery(b.title, search) ||
    matchesMultiLangQuery(b.author?.name, search) ||
    matchesMultiLangQuery(b.category?.name, search) ||
    matchesMultiLangQuery(b.description, search)
  ));
  const filteredCats = cats.filter(c => matchesMultiLangQuery(c.name, search));
  const totalPages = Math.max(1,Math.ceil((tab==="categories"?filteredCats.length:filtered.length)/ITEMS));
  const paginated  = filtered.slice((page-1)*ITEMS,page*ITEMS);
  const paginatedCats = filteredCats.slice((page-1)*ITEMS,page*ITEMS);

  const handleSaveBook = async (type:"physical"|"digital", fd:FormData) => {
    try {
      if (editing) { await updateBook.mutateAsync({id:editing.id,type,data:fd}); toast.success(type==="physical"?String(t("admin_books.messages.update_physical_success")):String(t("admin_books.messages.update_digital_success"))); }
      else          { await createBook.mutateAsync({type,data:fd}); toast.success(type==="physical"?String(t("admin_books.messages.add_physical_success")):String(t("admin_books.messages.add_digital_success"))); }
      setShowBook(false); setEditing(null);
    } catch(e) { toast.error(err(e,"Failed")); }
  };

  const handleDeleteBook = async () => {
    if (!deleteCandidate) return;
    await deleteBook.mutateAsync({id:deleteCandidate.id,type:deleteCandidate.type});
    toast.success(String(t("admin_books.messages.delete_success"))); setDel(null);
  };

  const toggleBulk=(id:string)=>setBulkSelected(p=>{const n=new Set(p);if(n.has(id)){n.delete(id);}else{n.add(id);}return n;});
  const allPageSelected=paginated.length>0&&paginated.every(b=>bulkSelected.has(b.id));
  const handleBulkDelete=async()=>{
    if(!bulkSelected.size) return;
    setBulkDeleting(true);
    const ids = Array.from(bulkSelected);
    let success = 0;
    try{
      for (const id of ids) {
        const b = allBooks.find(bk=>bk.id===id);
        if (b) {
          await deleteBook.mutateAsync({id, type: b.type||"physical"});
          success++;
        }
      }
      toast.success(`Deleted ${success} book${success>1?"s":""}`);
      setBulkSelected(new Set());
      await refetchBooks();
      await refetchDigital();
    }catch(e){
      if (success > 0) {
        toast.success(`Deleted ${success} of ${ids.length} books`);
        await refetchBooks();
        await refetchDigital();
      }
      toast.error(err(e,"Failed to delete some books"));
    }
    finally{setBulkDeleting(false);}
  };

  const handleSaveCat = async (e:React.FormEvent) => {
    e.preventDefault(); if(!catName.trim()) return;
    try {
      if (editCatId) { await updateCat.mutateAsync({id:editCatId,data:{name:catName}}); toast.success(String(t("admin_categories.messages.update_success"))); }
      else           { await createCat.mutateAsync({name:catName});                     toast.success(String(t("admin_categories.messages.add_success"))); }
      setShowCat(false); setEditCatId(null); setCatName("");
    } catch(e) { toast.error(err(e,"Failed")); }
  };

  const TABS:{key:Tab;label:string}[] = [
    {key:"all",       label:String(t("admin_books.tabs.all"))},
    {key:"physical",  label:String(t("admin_books.tabs.physical"))},
    {key:"digital",   label:String(t("admin_books.tabs.digital"))},
    {key:"categories",label:String(t("admin_books.tabs.categories"))},
  ];

  const bookCols: ColumnDef<Book,unknown>[] = [
    { id:"sel", header:()=><input type="checkbox" checked={allPageSelected} onChange={e=>{e.stopPropagation();paginated.forEach(b=>e.target.checked?setBulkSelected(p=>{const n=new Set(p);n.add(b.id);return n;}):setBulkSelected(p=>{const n=new Set(p);n.delete(b.id);return n;}));}} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>,
      cell:({row})=><input type="checkbox" checked={bulkSelected.has(row.original.id)} onChange={()=>toggleBulk(row.original.id)} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>},
    { id:"title",    header:String(t("admin_books.table.title")),    cell:({row})=><div className="min-w-0"><p className="text-[13px] font-bold text-[#0d0d0d] truncate max-w-[180px]">{row.original.title}</p><p className="text-[11px] text-[#0d0d0d]/40">{row.original.author?.name||"—"}</p></div> },
    { id:"category", header:String(t("admin_books.table.category")), cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.category?.name||"—"}</span> },
    { id:"copies",   header:String(t("admin_books.table.copies")),   cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.type==="digital"?"—":row.original.total??0}</span> },
    { id:"status",   header:String(t("admin_books.table.status")),
      cell:({row})=>{
        const b=row.original;
        const cls = b.type==="digital"?"bg-[#f5f4f0] text-[#0d0d0d]":b.available===0?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700";
        const lbl = b.type==="digital"?(b.pdf_access==="RESTRICTED"?String(t("admin_books.status.read_only")):String(t("admin_books.status.download_allowed")))
          : b.available===0?String(t("admin_books.status.out_of_stock")):String(t("admin_books.status.available"));
        return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${cls}`}>{lbl}</span>;
      },
    },
    { id:"actions", header:"",
      cell:({row})=>{
        const b=row.original;
        return (
          <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
            <PortalDropdown
              isOpen={openMenu===b.id}
              onClose={()=>setOpenMenu(null)}
              trigger={
                <button type="button" onClick={()=>setOpenMenu(c=>c===b.id?null:b.id)}
                  className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors">
                  <MoreHorizontal size={15}/>
                </button>
              }
            >
              <div className="min-w-[148px] bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden">
                <button type="button" onClick={()=>{setOpenMenu(null);setEditing(b);setShowBook(true);}}
                  className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors">
                  {String(t("admin_books.actions.edit"))}
                </button>
                {b.type==="physical" && (
                  <button type="button" onClick={()=>{setOpenMenu(null);setCondBook({id:b.id,title:b.title});}}
                    className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors">
                    {String(t("admin_books.actions.condition"))}
                  </button>
                )}
                <button type="button" onClick={()=>{setOpenMenu(null);setDel({id:b.id,type:b.type||"physical",title:b.title});}}
                  className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  {String(t("admin_books.actions.delete"))}
                </button>
              </div>
            </PortalDropdown>
          </div>
        );
      },
    },
  ];

  const catCols: ColumnDef<Category,unknown>[] = [
    { id:"name",    header:String(t("admin_categories.table.category")), cell:({row})=><span className="text-[13px] font-bold text-[#0d0d0d]">{row.original.name}</span> },
    { id:"physical",header:String(t("admin_categories.table.physical")), cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original._count?.books||0}</span> },
    { id:"digital", header:String(t("admin_categories.table.digital")),  cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original._count?.digital_books||0}</span> },
    { id:"actions", header:"",
      cell:({row})=>{
        const c=row.original;
        return (
          <div className="flex gap-2 justify-end" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>{setEditCatId(c.id);setCatName(c.name);setShowCat(true);}}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e4dc] text-[#0d0d0d]/60 hover:text-[#0d0d0d] transition-colors">
              Edit
            </button>
            <button onClick={()=>setDelCat({id:c.id,name:c.name})} disabled={deleteCat.isPending&&deleteCat.variables===c.id}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors">
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5" onClick={()=>setOpenMenu(null)}>
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p>
            <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_books.title"))}</h1>
            <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_books.subtitle"))}</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto flex-1">
            {tab!=="categories" && (
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30"/>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={String(t("admin_books.search_placeholder"))}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/>
              </div>
            )}
            <button onClick={()=>tab==="categories"?setShowCat(true):(setEditing(null),setShowBook(true))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold hover:bg-[#292524] transition-colors shrink-0">
              <Plus size={15}/>{tab==="categories"?String(t("admin_categories.add_new")):String(t("admin_books.add_new"))}
            </button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={fadeUp} className="flex gap-0.5 border-b border-[#e8e4dc]">
          {TABS.map(tb=>(
            <button key={tb.key} onClick={()=>{setTab(tb.key);setPage(1);setSearch("");}}
              className={`px-4 py-2.5 text-[12.5px] font-bold border-b-2 transition-colors ${tab===tb.key?"border-[#0d0d0d] text-[#0d0d0d]":"border-transparent text-[#0d0d0d]/40 hover:text-[#0d0d0d]"}`}>
              {tb.label}
            </button>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          {tab!=="categories"&&bulkSelected.size>0&&(
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
              <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} book{bulkSelected.size>1?"s":""} selected</span>
              <div className="flex gap-2">
                <button onClick={()=>setBulkSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">Clear</button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{bulkDeleting?"Deleting…":`Delete ${bulkSelected.size}`}</button>
              </div>
            </div>
          )}
          {tab==="categories"
            ? <TanStackTable data={paginatedCats} columns={catCols} isLoading={loading} emptyText={String(t("admin_categories.table.no_categories"))} skeletonRows={5}/>
            : <TanStackTable data={paginated}     columns={bookCols} isLoading={loading} emptyText={String(t("admin_books.table.no_books"))}         skeletonRows={5}/>
          }
        </motion.div>

        {/* Pagination */}
        {!loading && totalPages>1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              <ChevronLeft size={14}/>{String(t("common.pagination.previous"))}
            </button>
            <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              {String(t("common.pagination.next"))}<ChevronRight size={14}/>
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showBook && <BookModal onClose={()=>{setShowBook(false);setEditing(null);}} authors={authors} categories={cats} editingBook={editing} onSubmit={handleSaveBook} submitting={createBook.isPending||updateBook.isPending}/>}
        {condBook  && <ConditionModal bookId={condBook.id} title={condBook.title} onClose={()=>setCondBook(null)}/>}
        {deleteCandidate && (
          <Confirm title={String(t("admin_books.modal.edit_title"))} desc={`Delete "${deleteCandidate.title}"?`}
            confirmLabel={String(t("admin_books.actions.delete"))} tone="danger"
            onClose={()=>setDel(null)} onConfirm={handleDeleteBook} loading={deleteBook.isPending}/>
        )}
        {showCatModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e=>{if(e.target===e.currentTarget){setShowCat(false);setEditCatId(null);setCatName("");}}}>
            <motion.div variants={modalIn} initial="hidden" animate="show"
              className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl"
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">
                  {editCatId?String(t("admin_categories.modal.edit_title")):String(t("admin_categories.modal.add_title"))}
                </h3>
                <button onClick={()=>{setShowCat(false);setEditCatId(null);setCatName("");}} className="w-7 h-7 rounded-lg bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><X size={14}/></button>
              </div>
              <form onSubmit={handleSaveCat} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_categories.modal.label_name"))}</label>
                  <input required value={catName} onChange={e=>setCatName(e.target.value)} placeholder={String(t("admin_categories.modal.placeholder_name"))} className={IC}/>
                </div>
                <button type="submit" disabled={createCat.isPending||updateCat.isPending}
                  className="w-full py-3 rounded-xl bg-[#0d0d0d] text-white text-[13px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
                  {createCat.isPending||updateCat.isPending ? String(t("admin_categories.modal.submitting"))
                    : editCatId?String(t("admin_categories.modal.submit_update")):String(t("admin_categories.modal.submit_add"))}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {delCat && (
          <Confirm title={String(t("admin_categories.confirm.delete_title"))}
            desc={String(t("admin_categories.confirm.delete_desc",{name:delCat.name}))}
            confirmLabel={String(t("admin_categories.confirm.delete_btn"))} tone="danger"
            onClose={()=>setDelCat(null)}
            onConfirm={async()=>{ await deleteCat.mutateAsync(delCat.id); toast.success(String(t("admin_categories.messages.delete_success"))); setDelCat(null); }}
            loading={deleteCat.isPending}/>
        )}
      </AnimatePresence>
    </>
  );
}
