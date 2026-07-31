"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useOverdueRentals, useOverdueRanking, useSendReminders } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};
type OR={id:string;due_date:string;daysOverdue:number;estimatedFine:number;user:{name:string;email:string};physical_book:{title:string}};
type ORank={user:{id:string;name:string;email:string};overdueCount:number;totalDaysOverdue:number;totalEstimatedFine:number};

export default function AdminOverduePage() {
  const { t }=useLanguage();
  const [sel,setSel]=useState<Set<string>>(new Set());
  const {data:od,isLoading}=useOverdueRentals(); const {data:rd}=useOverdueRanking(); const send=useSendReminders();
  const rows:OR[]=(od?.rentals||[]) as unknown as OR[];
  const ranking:ORank[]=((rd as unknown as {ranking?:ORank[]})?.ranking||[]) as ORank[];
  const maxDays=Math.max(1,...ranking.map(r=>r.totalDaysOverdue));
  const toggle=(id:string)=>setSel(p=>{const n=new Set(p);if(n.has(id)){n.delete(id);}else{n.add(id);}return n;});
  const selectAll=(c:boolean)=>setSel(c?new Set(rows.map(r=>r.id)):new Set());
  const handleSend=async()=>{
    try{await send.mutateAsync({rentalIds:Array.from(sel)});toast.success(String(t("admin_overdue.messages.reminders_success")));setSel(new Set());}
    catch{toast.error(String(t("admin_overdue.messages.reminders_failed")));}
  };
  const cols:ColumnDef<OR,unknown>[]=[
    {id:"sel",header:()=><input type="checkbox" checked={rows.length>0&&sel.size===rows.length} onChange={e=>selectAll(e.target.checked)} className="w-4 h-4 rounded border-[#e8e4dc]"/>,cell:({row})=><input type="checkbox" checked={sel.has(row.original.id)} onChange={()=>toggle(row.original.id)} className="w-4 h-4 rounded border-[#e8e4dc]"/>},
    {id:"student",header:String(t("admin_overdue.table.student")),cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.user?.name || "Student"}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.user?.email || ""}</p></div>},
    {id:"book",header:String(t("admin_overdue.table.book")),cell:({row})=><span className="text-[12px] text-[#0d0d0d] truncate block">{row.original.physical_book?.title || (row.original as any).book?.title || "Book"}</span>},

    {id:"due",header:String(t("admin_overdue.table.due_date")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.due_date).toLocaleDateString()}</span>},
    {id:"days",header:String(t("admin_overdue.table.days_overdue")),cell:({row})=><span className="text-[13px] font-black text-red-600">{row.original.daysOverdue}</span>},
    {id:"fine",header:String(t("admin_overdue.table.estimated_fine")),cell:({row})=><span className="text-[12px] font-bold text-[#0d0d0d]">{Number(row.original.estimatedFine).toFixed(2)} ETB</span>},
  ];
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p><h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_overdue.title"))}</h1><p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_overdue.subtitle"))}</p></div>
        <button onClick={handleSend} disabled={send.isPending||sel.size===0} className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold disabled:opacity-40 hover:bg-[#292524] transition-colors shrink-0">
          {send.isPending?String(t("admin_overdue.sending")):String(t("admin_overdue.send_reminder",{count:sel.size}))}
        </button>
      </motion.div>
      {/* Ranking */}
      {ranking.length>0&&(<motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-5 space-y-3">
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">{String(t("admin_overdue.ranking_title"))}</p>
        {ranking.map((item,i)=>(
          <div key={item.user.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#0d0d0d]">#{i+1} {item.user.name}</span>
              <span className="text-[11px] text-[#0d0d0d]/45 tabular-nums">{item.totalDaysOverdue} {String(t("admin_overdue.days"))} · {item.totalEstimatedFine.toFixed(2)} ETB</span>
            </div>
            <div className="h-1.5 bg-[#e8e4dc] rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${(item.totalDaysOverdue/maxDays)*100}%`}} transition={{duration:0.7,ease:[0.16,1,0.3,1],delay:i*0.05}} className="h-full rounded-full bg-red-500"/>
            </div>
          </div>
        ))}
      </motion.div>)}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden"><TanStackTable data={rows} columns={cols} isLoading={isLoading} emptyText={String(t("admin_overdue.table.no_overdue"))} skeletonRows={5}/></motion.div>
    </motion.div>
  );
}
