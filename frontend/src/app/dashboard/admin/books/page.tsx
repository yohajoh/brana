"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Upload, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  useBooks, useDigitalBooks, useCategories, useAuthors,
  useCreateBook, useUpdateBook, useDeleteBook,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateAuthor, useBookCopies, useConditionHistory, useUpdateCondition,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown, TruncatedCell } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

type Tab = "all"|"physical"|"digital"|"categories";
const ITEMS = 10;
const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.06}} };
const modalIn = { hidden:{opacity:0,scale:0.97,y:16}, show:{opacity:1,scale:1,y:0,transition:{duration:0.28,ease:[0.16,1,0.3,1]}} };
const IC = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all placeholder:text-[#0d0d0d]/25";

interface Book {
  id:string; title:string; author_id?:string; category_id?:string;
  author?:{id:string;name:string}; category?:{id:string;name:string};
  copies?:number; total?:number; available?:number;
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

/* ── Searchable dropdown ────────────────────────────────── */
function SearchDropdown({ label, placeholder, options, selectedId, onSelect, onCreate, isCreating }:
  { label:string; placeholder:string; options:{id:string;name:string}[]; selectedId:string;
    onSelect:(o:{id:string;name:string})=>void; onCreate:(v:string)=>Promise<void>; isCreating:boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find(o=>o.id===selectedId);
  const filtered = options.filter(o=>o.name.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.trim().length>0 && !options.some(o=>o.name.toLowerCase()===q.trim().toLowerCase());

  useEffect(() => {
    const h = (e:MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider mb-1.5">{label} *</label>
      <button type="button" onClick={()=>{setOpen(v=>!v); setQ("");}}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-left hover:bg-white focus:outline-none focus:border-[#0d0d0d] transition-all">
        <span className={sel?"text-[#0d0d0d]":"text-[#0d0d0d]/30"}>{sel?.name||placeholder}</span>
        <ChevronDown size={14} className={`text-[#0d0d0d]/30 transition-transform ${open?"rotate-180":""}`}/>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:-6,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.98}}
            transition={{duration:0.15}} className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden">
            <div className="p-2.5 border-b border-[#e8e4dc]">
              <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#e8e4dc] focus:outline-none focus:border-[#0d0d0d] bg-[#f5f4f0] focus:bg-white transition-all"/>
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length===0 ? <p className="px-3 py-2 text-sm text-[#0d0d0d]/35">No matches</p>
                : filtered.map(o=>(
                  <button key={o.id} type="button" onClick={()=>{onSelect(o);setOpen(false);setQ("");}}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId===o.id?"bg-[#0d0d0d] text-white font-bold":"text-[#0d0d0d] hover:bg-[#f5f4f0]"}`}>
                    {o.name}
                  </button>
                ))}
            </div>
            {canCreate && (
              <div className="p-2.5 border-t border-[#e8e4dc]">
                <button type="button" disabled={isCreating} onClick={async()=>{await onCreate(q.trim());setOpen(false);setQ("");}}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold disabled:opacity-50 transition-colors hover:bg-[#292524]">
                  {isCreating ? "Creating…" : `Create "${q.trim()}"`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [imageFile, setImageFile]   = useState<File|null>(null);
  const [galleryFiles, setGallery]  = useState<File[]>([]);
  const [pdfFile, setPdfFile]       = useState<File|null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const createAuthor   = useCreateAuthor();
  const createCategory = useCreateCategory();

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

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k,v])=>{ if(v!=="") fd.append(k,String(v)); });
    if (imageFile)  fd.append("image", imageFile);
    if (pdfFile)    fd.append("pdf", pdfFile);
    galleryFiles.forEach(f=>fd.append("images",f));
    await onSubmit(type, fd);
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
        transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
        className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc] shrink-0">
          <h2 className="text-[16px] font-serif font-black text-[#0d0d0d]">
            {editingBook ? String(t("admin_books.modal.edit_title")) : String(t("admin_books.modal.add_title"))}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors">
            <X size={15}/>
          </button>
        </div>
        {/* Type tabs */}
        {!editingBook && (
          <div className="flex gap-1 p-3 border-b border-[#e8e4dc] shrink-0">
            {(["physical","digital"] as const).map(tp=>(
              <button key={tp} type="button" onClick={()=>setType(tp)}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${type===tp?"bg-[#0d0d0d] text-white":"text-[#0d0d0d]/50 hover:text-[#0d0d0d]"}`}>
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
            <SearchDropdown label={String(t("admin_books.modal.labels.author"))} placeholder={String(t("admin_books.modal.placeholders.author"))}
              options={authors} selectedId={form.author_id} onSelect={o=>f("author_id")(o.id)}
              onCreate={async v=>{ const r = await createAuthor.mutateAsync(new FormData()); f("author_id")(r?.data?.author?.id||""); void v; }}
              isCreating={createAuthor.isPending}/>
            <SearchDropdown label={String(t("admin_books.modal.labels.category"))} placeholder={String(t("admin_books.modal.placeholders.category"))}
              options={categories} selectedId={form.category_id} onSelect={o=>f("category_id")(o.id)}
              onCreate={async v=>{ const r = await createCategory.mutateAsync({name:v}); f("category_id")(r?.data?.category?.id||""); }}
              isCreating={createCategory.isPending}/>
          </div>
          {type==="physical" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["copies",t("admin_books.modal.labels.copies")],["pages",t("admin_books.modal.labels.pages")],
                ["rental_price",t("admin_books.modal.labels.rental_price")],["loan_duration_days",t("admin_books.modal.labels.loan_duration")]].map(([k,lb])=>(
                <div key={k as string} className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{lb}</label>
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
            <button type="button" onClick={()=>imgRef.current?.click()}
              className="w-full h-24 rounded-xl border-2 border-dashed border-[#e8e4dc] flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d]/70 transition-colors">
              <Upload size={16}/>{imageFile ? imageFile.name : String(t("admin_books.modal.drop_image"))}
            </button>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e=>setImageFile(e.target.files?.[0]||null)}/>
          </div>
          {type==="digital" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.pdf_file"))}</label>
              <button type="button" onClick={()=>pdfRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-[#e8e4dc] flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d]/70 transition-colors">
                <Upload size={16}/>{pdfFile ? pdfFile.name : String(t("admin_books.modal.drop_pdf"))}
              </button>
              <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={e=>setPdfFile(e.target.files?.[0]||null)}/>
            </div>
          )}
          {type==="physical" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.modal.labels.book_gallery"))}</label>
              <button type="button" onClick={()=>galRef.current?.click()}
                className="w-full h-16 rounded-xl border-2 border-dashed border-[#e8e4dc] flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 transition-colors">
                <Upload size={16}/>{galleryFiles.length>0?`${galleryFiles.length} file(s)`:String(t("admin_books.modal.drop_gallery"))}
              </button>
              <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>setGallery(Array.from(e.target.files||[]))}/>
            </div>
          )}
        </form>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#e8e4dc] shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] transition-colors">
            Cancel
          </button>
          <button type="submit" form="book-form" disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
            {submitting ? (editingBook?String(t("admin_books.modal.submitting_update")):String(t("admin_books.modal.submitting_add")))
              : (editingBook?String(t("admin_books.modal.submit_update")):String(t("admin_books.modal.submit_add")))}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Condition Modal ────────────────────────────────────── */
function ConditionModal({ bookId, title, onClose }:{ bookId:string; title:string; onClose:()=>void }) {
  const { t } = useLanguage();
  const [selectedCopy, setSelectedCopy] = useState<BookCopy|null>(null);
  const [newCond, setNewCond]           = useState("");
  const [notes, setNotes]               = useState("");
  const { data: copiesData }  = useBookCopies(bookId);
  const { data: historyData } = useConditionHistory(bookId);
  const update = useUpdateCondition();
  const copies:BookCopy[]  = copiesData?.data?.copies||[];
  const history:CondHist[] = historyData?.data?.history||[];
  const CONDITIONS = ["NEW","GOOD","WORN","DAMAGED","LOST"];

  const handleUpdate = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!selectedCopy||!newCond) return;
    try {
      await update.mutateAsync({ copyId:selectedCopy.id, data:{ condition:newCond, notes:notes||undefined } });
      toast.success("Condition updated");
      setSelectedCopy(null); setNewCond(""); setNotes("");
    } catch(e) { toast.error(e instanceof Error?e.message:"Failed to update"); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
        transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
        className="bg-white w-full sm:rounded-2xl sm:max-w-xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc] shrink-0">
          <div>
            <h2 className="text-[15px] font-serif font-black text-[#0d0d0d]">{String(t("admin_books.condition_modal.title"))}</h2>
            <p className="text-[12px] text-[#0d0d0d]/45 truncate">{title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Copies list */}
          <div>
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-2">{String(t("admin_books.condition_modal.all_copies"))}</p>
            <div className="space-y-1.5">
              {copies.length===0 ? <p className="text-sm text-[#0d0d0d]/35">{String(t("admin_books.condition_modal.no_copies"))}</p>
                : copies.map(c=>(
                  <button key={c.id} type="button" onClick={()=>{setSelectedCopy(c);setNewCond(c.condition);setNotes("");}}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${selectedCopy?.id===c.id?"border-[#0d0d0d] bg-[#f5f4f0]":"border-[#e8e4dc] bg-white hover:border-[#0d0d0d]/30"}`}>
                    <div>
                      <p className="text-[13px] font-bold text-[#0d0d0d]">{c.copy_code}</p>
                      <p className="text-[11px] text-[#0d0d0d]/40">{c.condition} · {c.is_available?String(t("admin_books.condition_modal.status.available")):String(t("admin_books.condition_modal.status.checked_out"))}</p>
                    </div>
                    {selectedCopy?.id===c.id && <span className="w-2 h-2 rounded-full bg-[#f5c518]"/>}
                  </button>
                ))}
            </div>
          </div>
          {/* Update form */}
          {selectedCopy && (
            <form onSubmit={handleUpdate} className="space-y-3 bg-[#f5f4f0] rounded-xl p-4">
              <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">{String(t("admin_books.condition_modal.update_title"))}</p>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.condition_modal.new_condition"))}</label>
                <select value={newCond} onChange={e=>setNewCond(e.target.value)} required className={IC}>
                  <option value="">Select…</option>
                  {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_books.condition_modal.notes_label"))}</label>
                <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder={String(t("admin_books.condition_modal.notes_placeholder"))} className={`${IC} resize-none`}/>
              </div>
              <button type="submit" disabled={update.isPending}
                className="px-4 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
                {update.isPending ? String(t("admin_books.condition_modal.saving")) : String(t("admin_books.condition_modal.submit_update"))}
              </button>
            </form>
          )}
          {/* History */}
          {history.length>0 && (
            <div>
              <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-2">{String(t("admin_books.condition_modal.history_title"))}</p>
              <div className="space-y-1.5">
                {history.slice(0,10).map(h=>(
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e8e4dc]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#0d0d0d]">{h.old_condition} → {h.new_condition}</p>
                      {h.notes && <p className="text-[11px] text-[#0d0d0d]/40 truncate">{h.notes}</p>}
                    </div>
                    <p className="text-[10px] text-[#0d0d0d]/30 shrink-0">{new Date(h.created_at).toLocaleDateString()}</p>
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

  const { data: booksData,    isLoading: bl } = useBooks("limit=200");
  const { data: digitalData,  isLoading: dl } = useDigitalBooks("limit=200");
  const { data: catsData,     isLoading: cl } = useCategories("limit=200");
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
    b.title?.toLowerCase().includes(search.toLowerCase())||
    b.author?.name?.toLowerCase().includes(search.toLowerCase())||
    b.category?.name?.toLowerCase().includes(search.toLowerCase())
  ));
  const totalPages = Math.max(1,Math.ceil((tab==="categories"?cats.length:filtered.length)/ITEMS));
  const paginated  = filtered.slice((page-1)*ITEMS,page*ITEMS);
  const paginatedCats = cats.slice((page-1)*ITEMS,page*ITEMS);

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

  const toggleBulk=(id:string)=>setBulkSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const allPageSelected=paginated.length>0&&paginated.every(b=>bulkSelected.has(b.id));
  const handleBulkDelete=async()=>{
    if(!bulkSelected.size) return;
    setBulkDeleting(true);
    try{
      await Promise.all(Array.from(bulkSelected).map(id=>{
        const b=allBooks.find(bk=>bk.id===id);
        return b?deleteBook.mutateAsync({id,type:b.type||"physical"}):Promise.resolve();
      }));
      toast.success(`Deleted ${bulkSelected.size} book${bulkSelected.size>1?"s":""}`);
      setBulkSelected(new Set());
    }catch(e){toast.error(err(e,"Failed to delete"));}
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
