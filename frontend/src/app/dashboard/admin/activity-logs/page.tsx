"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from "framer-motion";
import { useActivityLogs } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, TruncatedCell } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};

type LogRow={id:string;action:string;entity_type:string;entity_id:string|null;description:string;metadata:any;ip_address:string|null;created_at:string;admin:{name:string;email:string}};

const actionStyle=(a:string)=>{switch(a){case "CREATE":return "bg-emerald-50 text-emerald-700";case "DELETE":return "bg-red-50 text-red-700";case "UPDATE":return "bg-amber-50 text-amber-700";default:return "bg-[#f5f4f0] text-[#0d0d0d]/50";}};

export default function AdminActivityLogsPage() {
  const { t }=useLanguage();
  const {data,isLoading}=useActivityLogs("limit=200");
  const logs:LogRow[]=(data as unknown as {logs?:LogRow[]})?.logs||[];

  const cols:ColumnDef<LogRow,unknown>[]=[
    {id:"admin",   header:String(t("admin_activity_logs.table.admin")),       cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.admin?.name||String(t("admin_activity_logs.system"))}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.admin?.email||"internal@system"}</p></div>},
    {id:"action",  header:String(t("admin_activity_logs.table.action")),       cell:({row})=><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${actionStyle(row.original.action)}`}>{row.original.action}</span>},
    {id:"entity",  header:"Entity",                                             cell:({row})=><span className="inline-flex px-2 py-0.5 rounded-md bg-[#f5f4f0] text-[9px] font-black uppercase text-[#0d0d0d]/50">{row.original.entity_type}</span>},
    {id:"desc",    header:String(t("admin_activity_logs.table.description")),  cell:({row})=><TruncatedCell text={row.original.description} maxLength={60}/>},
    {id:"time",    header:String(t("admin_activity_logs.table.timestamp")),    cell:({row})=><div><p className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.created_at).toLocaleDateString()}</p><p className="text-[10px] text-[#0d0d0d]/30">{new Date(row.original.created_at).toLocaleTimeString()}</p></div>},
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">System</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_activity_logs.title"))}</h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_activity_logs.subtitle"))}</p>
        </div>
        <span className="px-4 py-2 bg-white border border-[#e8e4dc] rounded-xl text-[10px] font-black text-[#0d0d0d]/45 uppercase tracking-wider shrink-0">{String(t("admin_activity_logs.retention"))}</span>
      </motion.div>
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
        <TanStackTable data={logs} columns={cols} isLoading={isLoading} emptyText={String(t("admin_activity_logs.no_logs"))} skeletonRows={5}/>
      </motion.div>
    </motion.div>
  );
}
