"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { API_BASE_URL, fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.08}}};

export default function AdminReportsPage() {
  const { t }=useLanguage();
  const [active,setActive]=useState("rentals");
  const [rows,setRows]=useState<Record<string,unknown>[]>([]);
  const [loading,setLoading]=useState(false);

  const REPORTS=[
    {key:"rentals",      label:String(t("admin_reports.types.rentals"))},
    {key:"overdue",      label:String(t("admin_reports.types.overdue"))},
    {key:"users",        label:String(t("admin_reports.types.users"))},
    {key:"inventory",    label:String(t("admin_reports.types.inventory"))},
    {key:"reservations", label:String(t("admin_reports.types.reservations"))},
  ];

  const load=async(type:string)=>{
    setLoading(true); setActive(type);
    try{const d=await fetchApi(`/admin/reports/export?type=${type}&format=json`);setRows(d?.data?.rows||[]);}
    catch{toast.error(String(t("admin_reports.messages.load_failed")));setRows([]);}
    finally{setLoading(false);}
  };

  const headers=useMemo(()=>(rows.length>0?Object.keys(rows[0]).slice(0,6):[]),[rows]);
  const cols=useMemo<ColumnDef<Record<string,unknown>,unknown>[]>(()=>headers.map(h=>({
    header:h.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
    cell:({row})=><span className="text-[12px] text-[#0d0d0d]/70 truncate block">{String(row.original[h]??"")}</span>,
  })),[headers]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 sm:p-6 space-y-5">
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_reports.title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_reports.subtitle"))}</p>
      </motion.div>

      {/* Report type pills */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {REPORTS.map(r=>(
          <button key={r.key} onClick={()=>load(r.key)}
            className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${active===r.key?"bg-[#0d0d0d] text-white":"bg-white border border-[#e8e4dc] text-[#0d0d0d]/60 hover:text-[#0d0d0d]"}`}>
            {r.label}
          </button>
        ))}
      </motion.div>

      {/* Download buttons */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {(["csv","excel","pdf"] as const).map(fmt=>(
          <a key={fmt} href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=${fmt}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 transition-colors">
            <Download size={13}/>{fmt.toUpperCase()}
          </a>
        ))}
      </motion.div>

      {/* Preview table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
        <TanStackTable data={rows.slice(0,20)} columns={cols} isLoading={loading}
          emptyText={String(t("admin_reports.select_report"))} skeletonRows={4}/>
      </motion.div>
    </motion.div>
  );
}
