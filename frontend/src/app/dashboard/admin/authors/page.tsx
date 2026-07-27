"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Upload, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useAuthors, useCreateAuthor, useUpdateAuthor, useDeleteAuthor, type Author } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown, TruncatedCell } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};
const IC="w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all placeholder:text-[#0d0d0d]/25";
const ITEMS=10;

export default function AdminAuthorsPage() {
  const { t }=useLanguage();
  const [search,setSearch]=useState(""); const [page,setPage]=useState(1);
  const [showModal,setModal]=useState(false); const [editId,setEditId]=useState<string|null>(null);
  const [form,setForm]=useState({name:"",bio:""});
  const [imgFile,setImg]=useState<File|null>(null); const [imgPreview,setPreview]=useState<string|null>(null);
  const [openMenu,setMenu]=useState<string|null>(null);
  const [delAuthor,setDel]=useState<{id:string;name:string}|null>(null);
  const imgRef=useRef<HTMLInputElement>(null);
  const {data,isLoading}=useAuthors(); const create=useCreateAuthor(); const upd=useUpdateAuthor(); const del=useDeleteAuthor();
  const authors:Author[]=data?.authors||[];
  const err=(e:unknown,fb:string)=>e instanceof Error&&e.message?e.message:fb;
  useEffect(()=>{const h=()=>setMenu(null);window.addEventListener("click",h);return()=>window.removeEventListener("click",h);},[]);
  const filtered=authors.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||(a.bio?.toLowerCase().includes(search.toLowerCase())??false));
  const totalPages=Math.max(1,Math.ceil(filtered.length/ITEMS));
  const paginated=filtered.slice((page-1)*ITEMS,page*ITEMS);
  const openEdit=(a:Author)=>{setEditId(a.id);setForm({name:a.name||"",bio:a.bio||""});setImg(null);setPreview(a.image||null);setModal(true);};
  const openNew=()=>{setEditId(null);setForm({name:"",bio:""});setImg(null);setPreview(null);setModal(true);};
  const close=()=>{setModal(false);setEditId(null);setForm({name:"",bio:""});setImg(null);setPreview(null);};
  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f){setImg(f);setPreview(URL.createObjectURL(f));}};
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); const fd=new FormData(); fd.append("name",form.name); fd.append("bio",form.bio); if(imgFile) fd.append("image",imgFile);
    try {
      if(editId){await upd.mutateAsync({id:editId,formData:fd});toast.success(String(t("admin_authors.messages.update_success")));}
      else{await create.mutateAsync(fd);toast.success(String(t("admin_authors.messages.add_success")));}
      close();
    } catch(e2){toast.error(err(e2,String(t("admin_authors.messages.add_failed"))));}
  };
  const handleDelete=async()=>{
    if(!delAuthor) return;
    try{await del.mutateAsync(delAuthor.id);toast.success(String(t("admin_authors.messages.delete_success")));setDel(null);}
    catch(e2){toast.error(err(e2,String(t("admin_authors.messages.delete_failed"))));}
  };
  const cols:ColumnDef<Author,unknown>[]=[
    {id:"img",header:"",cell:({row})=><div className="w-9 h-9 rounded-xl overflow-hidden bg-[#f5f4f0] border border-[#e8e4dc] flex items-center justify-center text-[12px] font-black text-[#0d0d0d]/40">{row.original.image?<Image src={row.original.image} alt={row.original.name} width={36} height={36} className="object-cover w-full h-full" unoptimized/>:row.original.name.charAt(0)}</div>},
    {id:"name",header:String(t("admin_authors.table.name")),cell:({row})=><span className="text-[13px] font-bold text-[#0d0d0d]">{row.original.name}</span>},
    {id:"bio", header:String(t("admin_authors.table.bio")), cell:({row})=><TruncatedCell text={row.original.bio||""} maxLength={50}/>},
    {id:"books",header:String(t("admin_authors.table.books")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50 tabular-nums">{(row.original._count?.books||0)+(row.original._count?.digital_books||0)}</span>},
    {id:"status",header:String(t("admin_authors.table.status")),cell:()=><span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{String(t("admin_authors.status.active"))}</span>},
    {id:"actions",header:"",cell:({row})=>{const a=row.original;return(
      <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
        <PortalDropdown
          isOpen={openMenu===a.id}
          onClose={()=>setMenu(null)}
          trigger={
            <button onClick={()=>setMenu(v=>v===a.id?null:a.id)} className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><MoreHorizontal size={15}/></button>
          }
        >
          <div className="min-w-[148px] bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden">
            <button type="button" onClick={()=>{setMenu(null);openEdit(a);}} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors">Edit</button>
            <button type="button" onClick={()=>{setMenu(null);setDel({id:a.id,name:a.name});}} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 transition-colors">{String(t("admin_books.actions.delete"))}</button>
          </div>
        </PortalDropdown>
      </div>
    );}},
  ];
  return (<>
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 sm:p-6 space-y-5" onClick={()=>setMenu(null)}>
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="shrink-0"><p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p><h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_authors.title"))}</h1><p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_authors.subtitle"))}</p></div>
        <div className="flex gap-3 w-full sm:flex-1">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={String(t("admin_authors.search_placeholder"))} className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/></div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold hover:bg-[#292524] transition-colors shrink-0"><Plus size={15}/>{String(t("admin_authors.add_new"))}</button>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden"><TanStackTable data={paginated} columns={cols} isLoading={isLoading} emptyText={String(t("admin_authors.table.no_authors"))} skeletonRows={5}/></motion.div>
      {!isLoading&&totalPages>1&&(<motion.div variants={fadeUp} className="flex items-center justify-between">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"><ChevronLeft size={14}/>{String(t("common.pagination.previous"))}</button>
        <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
        <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">{String(t("common.pagination.next"))}<ChevronRight size={14}/></button>
      </motion.div>)}
    </motion.div>
    <AnimatePresence>
      {showModal&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={e=>{if(e.target===e.currentTarget)close();}}>
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} transition={{duration:0.28,ease:[0.16,1,0.3,1]}} className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dc] shrink-0"><h2 className="text-[16px] font-serif font-black text-[#0d0d0d]">{editId?String(t("admin_authors.modal.edit_title")):String(t("admin_authors.modal.add_title"))}</h2><button onClick={close} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><X size={15}/></button></div>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div className="space-y-1.5"><label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_authors.modal.labels.name"))} *</label><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder={String(t("admin_authors.modal.placeholders.name"))} className={IC}/></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_authors.modal.labels.bio"))} *</label><textarea required rows={4} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} placeholder={String(t("admin_authors.modal.placeholders.bio"))} className={`${IC} resize-none`}/></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_authors.modal.labels.image"))}</label>
              <button type="button" onClick={()=>imgRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-[#e8e4dc] overflow-hidden relative flex items-center justify-center gap-2 text-sm text-[#0d0d0d]/40 hover:border-[#0d0d0d]/30 transition-colors">
                {imgPreview?<Image src={imgPreview} alt="preview" fill className="object-cover" unoptimized/>:<><Upload size={16}/>{String(t("admin_authors.modal.drop_image"))}</>}
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            </div>
            <button type="submit" disabled={create.isPending||upd.isPending} className="w-full py-3 rounded-xl bg-[#0d0d0d] text-white text-[13px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
              {create.isPending||upd.isPending?"Saving…":editId?String(t("admin_authors.modal.submit_update")):String(t("admin_authors.modal.submit_add"))}
            </button>
          </form>
        </motion.div>
      </motion.div>)}
      {delAuthor&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)setDel(null);}}>
        <motion.div initial={{opacity:0,scale:0.97,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}} transition={{duration:0.25,ease:[0.16,1,0.3,1]}} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
          <h3 className="text-[17px] font-serif font-black text-[#0d0d0d] mb-2">{String(t("admin_authors.confirm.delete_title"))}</h3>
          <p className="text-sm text-[#0d0d0d]/55 mb-6">{String(t("admin_authors.confirm.delete_desc",{name:delAuthor.name}))}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={()=>setDel(null)} disabled={del.isPending} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] disabled:opacity-40 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={del.isPending} className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">{del.isPending?"Deleting…":String(t("admin_authors.confirm.delete_confirm"))}</button>
          </div>
        </motion.div>
      </motion.div>)}
    </AnimatePresence>
  </>);
}
