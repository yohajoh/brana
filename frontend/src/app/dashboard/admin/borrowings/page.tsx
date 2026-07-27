"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRentals, useProcessReturn } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};
const ITEMS=10;

type Rental={id:string;status:string;loan_date:string;due_date:string;return_date?:string|null;fine?:number|null;isOverdue?:boolean;daysOverdue?:number;user:{name:string;email:string;student_id?:string|null};physical_book:{title:string}};

const statusStyle=(s:string)=>{
  switch(s){case "BORROWED":return "bg-amber-50 text-amber-700";case "RETURNED":return "bg-emerald-50 text-emerald-700";case "COMPLETED":return "bg-[#f5f4f0] text-[#0d0d0d]/50";case "PENDING":return "bg-orange-50 text-orange-700";default:return "bg-[#f5f4f0] text-[#0d0d0d]/50";}
};

function BorrowingsContent() {
  const { t }=useLanguage();
  const searchParams=useSearchParams();
  const [search,setSearch]=useState(""); const [page,setPage]=useState(1);
  const statusFilter=searchParams.get("status")||"";
  const qp=new URLSearchParams(); qp.set("limit","200"); if(statusFilter) qp.set("status",statusFilter);
  const {data,isLoading,refetch}=useRentals(qp.toString()); const processReturn=useProcessReturn();
  const rentals:Rental[]=(data?.rentals||[]) as unknown as Rental[];
  const err=(e:unknown,fb:string)=>e instanceof Error&&e.message?e.message:fb;
  const filtered=rentals.filter(r=>!search.trim()||r.user?.name?.toLowerCase().includes(search.toLowerCase())||r.user?.email?.toLowerCase().includes(search.toLowerCase())||r.physical_book?.title?.toLowerCase().includes(search.toLowerCase())||r.status?.toLowerCase().includes(search.toLowerCase()));
  const totalPages=Math.max(1,Math.ceil(filtered.length/ITEMS));
  const paginated=filtered.slice((page-1)*ITEMS,page*ITEMS);
  const handleReturn=async(id:string)=>{try{await processReturn.mutateAsync(id);toast.success(String(t("admin_borrowings.messages.return_success")));}catch(e){toast.error(err(e,String(t("admin_borrowings.messages.return_failed")||"Failed")));}};

  const cols:ColumnDef<Rental,unknown>[]=[
    {id:"student",header:String(t("admin_borrowings.table.student")),cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.user?.name}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.user?.email}</p></div>},
    {id:"book",header:String(t("admin_borrowings.table.book")),cell:({row})=><span className="text-[12px] text-[#0d0d0d] truncate block">{row.original.physical_book?.title}</span>},
    {id:"loan",header:String(t("admin_borrowings.table.loan_date")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.loan_date).toLocaleDateString()}</span>},
    {id:"due",header:String(t("admin_borrowings.table.due_date")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.due_date).toLocaleDateString()}</span>},
    {id:"status",header:String(t("admin_borrowings.table.status")),cell:({row})=><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusStyle(row.original.status)}`}>{row.original.status}</span>},
    {id:"fine",header:String(t("admin_borrowings.table.fine")),cell:({row})=><span className={`text-[12px] ${Number(row.original.fine||0)>0?"font-bold text-red-600":"text-[#0d0d0d]/50"}`}>{Number(row.original.fine||0).toFixed(2)} ETB</span>},
    {id:"action",header:"",cell:({row})=>{const r=row.original; const done=r.status==="RETURNED"||r.status==="COMPLETED"; return(
      <button onClick={()=>handleReturn(r.id)} disabled={processReturn.isPending&&processReturn.variables===r.id||done}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${done?"border-[#e8e4dc] text-[#0d0d0d]/25 cursor-not-allowed":"border-[#e8e4dc] text-[#0d0d0d]/60 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d] disabled:opacity-40"}`}>
        {processReturn.isPending&&processReturn.variables===r.id?String(t("admin_borrowings.actions.processing")):String(t("admin_borrowings.actions.return"))}
      </button>
    );}},
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 sm:p-6 space-y-5">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p><h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_borrowings.title"))}</h1><p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_borrowings.subtitle"))}</p></div>
        <div className="flex gap-3 w-full sm:flex-1">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={String(t("admin_borrowings.search_placeholder"))} className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/></div>
          <button onClick={()=>refetch()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors shrink-0"><RefreshCcw size={14}/>{String(t("common.refresh")||"Refresh")}</button>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden"><TanStackTable data={paginated} columns={cols} isLoading={isLoading} emptyText={String(t("admin_borrowings.table.no_borrowings"))} skeletonRows={6}/></motion.div>
      {!isLoading&&totalPages>1&&(<motion.div variants={fadeUp} className="flex items-center justify-between">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"><ChevronLeft size={14}/>{String(t("common.pagination.previous"))}</button>
        <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
        <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">{String(t("common.pagination.next"))}<ChevronRight size={14}/></button>
      </motion.div>)}
    </motion.div>
  );
}

export default function AdminBorrowingsPage() {
  return <Suspense fallback={<div className="p-6 space-y-4">{[1,2,3].map(i=><div key={i} className="h-12 bg-white rounded-xl border border-[#e8e4dc] animate-pulse"/>)}</div>}><BorrowingsContent/></Suspense>;
}
