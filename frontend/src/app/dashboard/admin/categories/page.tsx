"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp  = {hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger = {hidden:{},show:{transition:{staggerChildren:0.07}}};
const IC = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all placeholder:text-[#0d0d0d]/25";
const ITEMS = 10;

interface Category { id:string; name:string; _count?:{books:number;digital_books:number} }

export default function AdminCategoriesPage() {
  const { t } = useLanguage();
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [showModal, setModal] = useState(false);
  const [editId, setEditId]   = useState<string|null>(null);
  const [name, setName]       = useState("");
  const [delCat, setDelCat]   = useState<{id:string;name:string}|null>(null);
  const [openMenu, setMenu]   = useState<string|null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data, isLoading, refetch } = useCategories();
  const create = useCreateCategory(); const update = useUpdateCategory(); const del = useDeleteCategory();
  const cats: Category[] = data?.categories||[];
  const err = (e:unknown,fb:string) => e instanceof Error&&e.message?e.message:fb;

  useEffect(()=>{const h=()=>setMenu(null);window.addEventListener("click",h);return()=>window.removeEventListener("click",h);},[]);

  const filtered   = cats.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1,Math.ceil(filtered.length/ITEMS));
  const paginated  = filtered.slice((page-1)*ITEMS,page*ITEMS);

  const openEdit = (c:Category)=>{setEditId(c.id);setName(c.name);setModal(true);};
  const openNew  = ()=>{setEditId(null);setName("");setModal(true);};
  const close    = ()=>{setModal(false);setEditId(null);setName("");};

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return;
    try {
      if (editId){ await update.mutateAsync({id:editId,data:{name:name.trim()}}); toast.success(String(t("admin_categories.messages.update_success"))); }
      else       { await create.mutateAsync({name:name.trim()});                  toast.success(String(t("admin_categories.messages.add_success"))); }
      close();
    } catch(e2) { toast.error(err(e2,"Failed")); }
  };

  const handleDelete = async () => {
    if (!delCat) return;
    try { await del.mutateAsync(delCat.id); toast.success(String(t("admin_categories.messages.delete_success"))); setDelCat(null); }
    catch(e2) { toast.error(err(e2,String(t("admin_categories.messages.add_failed")||"Failed"))); }
  };

  const toggleBulk = (id:string) => setBulkSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const allPageSelected = paginated.length>0 && paginated.every(c=>bulkSelected.has(c.id));
  const handleBulkDelete = async () => {
    if (!bulkSelected.size) return;
    setBulkDeleting(true);
    const ids = Array.from(bulkSelected);
    let success = 0;
    try {
      for (const id of ids) {
        await del.mutateAsync(id);
        success++;
      }
      toast.success(`Deleted ${success} categor${success>1?"ies":"y"}`);
      setBulkSelected(new Set());
      await refetch();
    } catch(e2) {
      if (success > 0) {
        toast.success(`Deleted ${success} of ${ids.length} categories`);
        await refetch();
      }
      toast.error(err(e2,"Failed to delete some categories"));
    }
    finally { setBulkDeleting(false); }
  };

  const cols: ColumnDef<Category,unknown>[] = [
    { id:"sel", header:()=><input type="checkbox" checked={allPageSelected} onChange={e=>{e.stopPropagation();paginated.forEach(c=>e.target.checked?setBulkSelected(p=>{const n=new Set(p);n.add(c.id);return n;}):setBulkSelected(p=>{const n=new Set(p);n.delete(c.id);return n;}));}} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>,
      cell:({row})=><input type="checkbox" checked={bulkSelected.has(row.original.id)} onChange={()=>toggleBulk(row.original.id)} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>},
    { id:"name",     header:String(t("admin_categories.table.category")), cell:({row})=><span className="text-[13px] font-bold text-[#0d0d0d]">{row.original.name}</span> },
    { id:"physical", header:String(t("admin_categories.table.physical")), cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50 tabular-nums">{row.original._count?.books||0}</span> },
    { id:"digital",  header:String(t("admin_categories.table.digital")),  cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50 tabular-nums">{row.original._count?.digital_books||0}</span> },
    { id:"actions",  header:"",
      cell:({row})=>{
        const c=row.original;
        return (
          <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
            <PortalDropdown
              isOpen={openMenu===c.id}
              onClose={()=>setMenu(null)}
              trigger={
                <button onClick={()=>setMenu(v=>v===c.id?null:c.id)} className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><MoreHorizontal size={15}/></button>
              }
            >
              <div className="min-w-[140px] bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden">
                <button type="button" onClick={()=>{setMenu(null);openEdit(c);}} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors">{String(t("admin_categories.actions.edit"))}</button>
                <button type="button" onClick={()=>{setMenu(null);setDelCat({id:c.id,name:c.name});}} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 transition-colors">{String(t("admin_categories.actions.delete"))}</button>
              </div>
            </PortalDropdown>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5" onClick={()=>setMenu(null)}>
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p>
            <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_categories.title"))}</h1>
            <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_categories.subtitle"))}</p>
          </div>
          <div className="flex gap-3 w-full sm:flex-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30"/>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={String(t("admin_categories.search_placeholder"))} className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/>
            </div>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold hover:bg-[#292524] transition-colors shrink-0"><Plus size={15}/>{String(t("admin_categories.add_new"))}</button>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          {bulkSelected.size>0&&(
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
              <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} selected</span>
              <div className="flex gap-2">
                <button onClick={()=>setBulkSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">Clear</button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{bulkDeleting?"Deleting…":`Delete ${bulkSelected.size}`}</button>
              </div>
            </div>
          )}
          <TanStackTable data={paginated} columns={cols} isLoading={isLoading} emptyText={String(t("admin_categories.table.no_categories"))} skeletonRows={5}/>
        </motion.div>
        {!isLoading && totalPages>1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"><ChevronLeft size={14}/>{String(t("common.pagination.previous"))}</button>
            <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">{String(t("common.pagination.next"))}<ChevronRight size={14}/></button>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)close();}}>
            <motion.div initial={{opacity:0,scale:0.97,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}} transition={{duration:0.25,ease:[0.16,1,0.3,1]}} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">{editId?String(t("admin_categories.modal.edit_title")):String(t("admin_categories.modal.add_title"))}</h3>
                <button onClick={close} className="w-7 h-7 rounded-lg bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><X size={14}/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_categories.modal.label_name"))}</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} placeholder={String(t("admin_categories.modal.placeholder_name"))} className={IC}/>
                </div>
                <button type="submit" disabled={create.isPending||update.isPending} className="w-full py-3 rounded-xl bg-[#0d0d0d] text-white text-[13px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
                  {create.isPending||update.isPending ? String(t("admin_categories.modal.submitting")) : editId?String(t("admin_categories.modal.submit_update")):String(t("admin_categories.modal.submit_add"))}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {delCat && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)setDelCat(null);}}>
            <motion.div initial={{opacity:0,scale:0.97,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}} transition={{duration:0.25,ease:[0.16,1,0.3,1]}} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
              <h3 className="text-[17px] font-serif font-black text-[#0d0d0d] mb-2">{String(t("admin_categories.confirm.delete_title"))}</h3>
              <p className="text-sm text-[#0d0d0d]/55 mb-6">{String(t("admin_categories.confirm.delete_desc",{name:delCat.name}))}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={()=>setDelCat(null)} disabled={del.isPending} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] transition-colors disabled:opacity-40">{String(t("admin_categories.confirm.cancel"))}</button>
                <button onClick={handleDelete} disabled={del.isPending} className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">{del.isPending?"Deleting…":String(t("admin_categories.confirm.delete_btn"))}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
