"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { useReservations, useExpireReservations, useMoveReservationToTop, useIssueReservation, useReservationHighDemand, type HighDemandReservationBook } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};
const IC="w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all placeholder:text-[#0d0d0d]/25";

type Reservation={id:string;status:string;queue_position:number;reserved_at:string;notified_at?:string|null;expires_at?:string|null;user_debt_total?:number;user:{name:string;email:string;student_id?:string|null};book:{id:string;title:string;available:number;copies?:number}};

const statusStyle=(s:string)=>{
  switch(s){case "NOTIFIED":return "bg-[#fdf9e7] text-[#a07c00]";case "FULFILLED":return "bg-emerald-50 text-emerald-700";case "EXPIRED":case "CANCELLED":return "bg-[#f5f4f0] text-[#0d0d0d]/35";default:return "bg-[#f5f4f0] text-[#0d0d0d]/55";}
};

import { Search } from "lucide-react";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

export default function AdminReservationsPage() {
  const { t }=useLanguage();
  const [search, setSearch] = useState("");
  const [openMenu,setMenu]=useState<string|null>(null);
  const [issueItem,setIssueItem]=useState<Reservation|null>(null);
  const [copyCode,setCopyCode]=useState("");
  const [selectedIds,setSelected]=useState<Set<string>>(new Set());
  const {data,isLoading}=useReservations();
  const {data:hdData,isLoading:hdLoading}=useReservationHighDemand("limit=6&min_queue=3");
  const expire=useExpireReservations(); const moveTop=useMoveReservationToTop(); const issue=useIssueReservation();
  const reservations:Reservation[]=(data?.reservations||[]) as unknown as Reservation[];
  const highDemand=(hdData?.data?.books||[]) as HighDemandReservationBook[];
  const err=(e:unknown,fb:string)=>e instanceof Error&&e.message?e.message:fb;

  const filtered = reservations.filter(r =>
    matchesMultiLangQuery(r.user?.name, search) ||
    matchesMultiLangQuery(r.user?.email, search) ||
    matchesMultiLangQuery(r.user?.student_id, search) ||
    matchesMultiLangQuery(r.book?.title, search) ||
    matchesMultiLangQuery(r.status, search)
  );

  const toggle=(id:string)=>setSelected(p=>{const n=new Set(p);if(n.has(id)){n.delete(id);}else{n.add(id);}return n;});
  const selectAll=(c:boolean)=>setSelected(c?new Set(filtered.map(r=>r.id)):new Set());

  const handleCancel=async()=>{
    try{const r=await expire.mutateAsync({notifyUsers:false,reservationIds:Array.from(selectedIds)});const count=Number(r?.data?.expiredCount??0);if(count===0){toast.info(String(t("admin_reservations.messages.no_cancelled")));return;}toast.success(String(t("admin_reservations.messages.cancel_success",{count})));setSelected(new Set());}
    catch(e){toast.error(err(e,"Failed"));}
  };
  const handleMoveTop=async(id:string)=>{setMenu(null);try{await moveTop.mutateAsync(id);toast.success(String(t("admin_reservations.messages.move_success")));}catch(e){toast.error(err(e,"Failed"));}};
  const handleIssue=async()=>{
    if(!issueItem) return; if(!copyCode.trim()){toast.error(String(t("admin_reservations.messages.copy_code_required")));return;}
    try{await issue.mutateAsync({id:issueItem.id,copy_code:copyCode.trim()});toast.success(String(t("admin_reservations.messages.issue_success")));setIssueItem(null);setCopyCode("");}
    catch(e){toast.error(err(e,"Failed"));}
  };

  const cols:ColumnDef<Reservation,unknown>[]=[
    {id:"sel",header:()=><input type="checkbox" checked={filtered.length>0&&selectedIds.size===filtered.length} onChange={e=>selectAll(e.target.checked)} className="w-4 h-4 rounded border-[#e8e4dc]"/>,cell:({row})=><input type="checkbox" checked={selectedIds.has(row.original.id)} onChange={()=>toggle(row.original.id)} className="w-4 h-4 rounded border-[#e8e4dc]"/>},
    {id:"student",header:String(t("admin_reservations.table.student")),cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.user.name}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.user.email}</p></div>},
    {id:"book",header:String(t("admin_reservations.table.book")),cell:({row})=><span className="text-[12px] text-[#0d0d0d] truncate block">{row.original.book.title}</span>},
    {id:"queue",header:String(t("admin_reservations.table.queue")),cell:({row})=><span className="text-[13px] font-black text-[#0d0d0d]">#{row.original.queue_position}</span>},
    {id:"status",header:String(t("admin_reservations.table.status")),cell:({row})=><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusStyle(row.original.status)}`}>{row.original.status}</span>},
    {id:"debt",header:String(t("admin_reservations.table.debt")),cell:({row})=>{const d=Number(row.original.user_debt_total||0);return<span className={`text-[12px] ${d>0?"font-bold text-red-600":"text-[#0d0d0d]/40"}`}>{d>0?`${d.toFixed(2)} ETB`:String(t("admin_reservations.table.clear"))}</span>;}},
    {id:"expires",header:String(t("admin_reservations.table.expires")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/40">{row.original.expires_at?new Date(row.original.expires_at).toLocaleDateString():"—"}</span>},
    {id:"action",header:"",cell:({row})=>{const item=row.original;return(
      <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
        <PortalDropdown
          isOpen={openMenu===item.id}
          onClose={()=>setMenu(null)}
          trigger={
            <button onClick={()=>setMenu(v=>v===item.id?null:item.id)} className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><MoreHorizontal size={15}/></button>
          }
        >
          <div className="min-w-[160px] bg-white rounded-xl border border-[#e8e4dc] shadow-xl overflow-hidden">
            <button disabled={item.status!=="QUEUED"||moveTop.isPending} onClick={()=>handleMoveTop(item.id)} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] disabled:opacity-30 transition-colors">{String(t("admin_reservations.actions.move_to_top"))}</button>
            <button disabled={issue.isPending||!["QUEUED","NOTIFIED"].includes(item.status)||(item.status==="QUEUED"&&Number(item.queue_position||0)!==1)||Number(item.user_debt_total||0)>0} onClick={()=>{setMenu(null);setIssueItem(item);setCopyCode("");}} className="flex w-full items-center px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0d0d0d] hover:bg-[#f5f4f0] disabled:opacity-30 transition-colors">{String(t("admin_reservations.actions.issue_book"))}</button>
          </div>
        </PortalDropdown>
      </div>
    );}},
  ];

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5" onClick={()=>setMenu(null)}>
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p><h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_reservations.title"))}</h1><p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_reservations.subtitle"))}</p></div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={String(t("common.search"))} className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/30 focus:outline-none focus:border-[#0d0d0d]" />
            </div>
            <button onClick={()=>window.location.reload()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors"><RefreshCcw size={14}/>{String(t("admin_reservations.refresh"))}</button>
            {selectedIds.size>0&&(<button onClick={handleCancel} disabled={expire.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-[12px] font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">{expire.isPending?String(t("admin_reservations.cancelling")):String(t("admin_reservations.cancel_selected",{count:selectedIds.size}))}</button>)}
          </div>
        </motion.div>

        {/* High demand */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-5">
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-3">{String(t("admin_reservations.high_demand.title"))}</p>
          {hdLoading?(<p className="text-sm text-[#0d0d0d]/35">{String(t("admin_reservations.high_demand.loading"))}</p>)
            :highDemand.length===0?(<p className="text-sm text-[#0d0d0d]/35">{String(t("admin_reservations.high_demand.no_demand"))}</p>)
            :(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{highDemand.map(item=>(
              <div key={item.book.id} className="rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] p-3.5">
                <p className="text-[13px] font-bold text-[#0d0d0d] truncate">{item.book.title}</p>
                <p className="text-[11px] text-[#0d0d0d]/45 mt-1">{String(t("admin_reservations.high_demand.queue"))}: {item.queueCount} · {String(t("admin_reservations.high_demand.copies"))}: {item.book.copies} · {String(t("admin_reservations.high_demand.available"))}: {item.book.available}</p>
                {item.needsInventoryAction&&<p className="text-[10px] font-black text-red-600 mt-1">{String(t("admin_reservations.high_demand.recommendation"))}</p>}
              </div>
            ))}</div>)}
        </motion.div>

        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden"><TanStackTable data={filtered} columns={cols} isLoading={isLoading} emptyText="No reservations found." skeletonRows={6}/></motion.div>
      </motion.div>

      {/* Issue modal */}
      <AnimatePresence>{issueItem&&(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget&&!issue.isPending){setIssueItem(null);setCopyCode("");}}}>
        <motion.div initial={{opacity:0,scale:0.97,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97}} transition={{duration:0.25,ease:[0.16,1,0.3,1]}} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-start justify-between mb-4"><div><h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">{String(t("admin_reservations.modal.title"))}</h3><p className="text-[12px] text-[#0d0d0d]/45 mt-0.5">{issueItem.book.title}</p></div><button onClick={()=>{setIssueItem(null);setCopyCode("");}} className="w-7 h-7 rounded-lg bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"><X size={14}/></button></div>
          <div className="space-y-1.5 mb-5"><label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{String(t("admin_reservations.modal.copy_code"))}</label><input value={copyCode} onChange={e=>setCopyCode(e.target.value)} placeholder="BC-XXXXXXXX-0001" className={IC}/></div>
          <div className="flex gap-3 justify-end">
            <button onClick={()=>{setIssueItem(null);setCopyCode("");}} disabled={issue.isPending} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] disabled:opacity-40 transition-colors">{String(t("admin_reservations.modal.cancel"))}</button>
            <button onClick={handleIssue} disabled={issue.isPending} className="px-4 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-sm font-bold hover:bg-[#292524] disabled:opacity-50 transition-colors">{issue.isPending?String(t("admin_reservations.modal.issuing")):"Issue Book"}</button>
          </div>
        </motion.div>
      </motion.div>)}</AnimatePresence>
    </>
  );
}
