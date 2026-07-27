"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAllNotifications, useMarkAsRead, useDeleteNotification, type Notification } from "@/lib/hooks/useNotifications";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.06}}};

type Alert={id:string;type:string;severity:string;message:string;is_resolved:boolean;created_at:string;book:{title:string;available:number;copies:number}};
type TabType="alerts"|"notifications";

function useInventoryAlerts(){return useQuery({queryKey:["inventory-alerts"],queryFn:()=>fetchApi<{alerts?:Alert[];data?:{alerts?:Alert[]}}>("/admin/inventory-alerts?limit=200"),staleTime:60000});}
function useResolveAlert(){const qc=useQueryClient();return useMutation({mutationFn:(id:string)=>fetchApi(`/admin/inventory-alerts/${id}/resolve`,{method:"PATCH"}),onMutate:async(id)=>{await qc.cancelQueries({queryKey:["inventory-alerts"]});const prev=qc.getQueriesData<{alerts?:Alert[];data?:{alerts?:Alert[]}}>({queryKey:["inventory-alerts"]});qc.setQueriesData<{alerts?:Alert[];data?:{alerts?:Alert[]}}>({queryKey:["inventory-alerts"]},old=>{if(!old)return old;const al=old.alerts||old.data?.alerts||[];const upd=al.map(a=>a.id===id?{...a,is_resolved:true}:a);return old.alerts?{...old,alerts:upd}:{...old,data:{...(old.data||{}),alerts:upd}};});return{prev};},onError:(_,__,ctx)=>{ctx?.prev?.forEach(([k,d])=>qc.setQueryData(k,d));},onSuccess:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]})});}
function useScanAlerts(){const qc=useQueryClient();return useMutation({mutationFn:()=>fetchApi("/admin/inventory-alerts/scan",{method:"POST"}),onSettled:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]})});}

const typeStyle=(type:string)=>{switch(type){case "ALERT":case "OVERDUE":return{dot:"bg-red-500",badge:"bg-red-50 text-red-700 border-red-100"};case "REMINDER":return{dot:"bg-amber-400",badge:"bg-amber-50 text-amber-700 border-amber-100"};case "NEW_BOOK":return{dot:"bg-emerald-500",badge:"bg-emerald-50 text-emerald-700 border-emerald-100"};default:return{dot:"bg-[#0d0d0d]/20",badge:"bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]"};}};
const sevStyle=(s:string)=>{switch(s){case "CRITICAL":return"bg-red-50 text-red-700 border-red-100";case "HIGH":return"bg-orange-50 text-orange-700 border-orange-100";case "MEDIUM":return"bg-amber-50 text-amber-700 border-amber-100";default:return"bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]";}};

function AlertsContent() {
  const { t }=useLanguage(); const router=useRouter(); const params=useSearchParams();
  const notifId=params.get("notification"); const activeTab=(params.get("tab") as TabType)||"alerts";
  const {data:alertsData,isLoading:loadAlerts}=useInventoryAlerts();
  const resolve=useResolveAlert(); const scan=useScanAlerts();
  const {data:notifData,isLoading:loadNotifs,refetch}=useAllNotifications({limit:100});
  const markRead=useMarkAsRead();
  const deleteOne=useDeleteNotification();
  const [bulkSelected,setBulkSelected]=useState<Set<string>>(new Set());
  const [bulkDeleting,setBulkDeleting]=useState(false);
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const notifList=notifData?.notifications||[];
  const allSelected=notifList.length>0&&notifList.every(n=>bulkSelected.has(n.id));
  const toggleSelect=(id:string)=>setBulkSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll=()=>setBulkSelected(allSelected?new Set():new Set(notifList.map(n=>n.id)));
  const active=useMemo(()=>{if(!notifId||!notifData?.notifications)return null;return notifData.notifications.find(n=>n.id===notifId)||null;},[notifId,notifData]);
  const alerts:Alert[]=alertsData?.alerts||alertsData?.data?.alerts||[];
  const setTab=(tab:TabType)=>{const p=new URLSearchParams(params.toString());p.set("tab",tab);router.push(`?${p.toString()}`,{scroll:false});};
  const closeOverlay=()=>{const p=new URLSearchParams(params.toString());p.delete("notification");router.replace(`?${p.toString()}`,{scroll:false});};
  const clickNotif=(n:Notification)=>{const p=new URLSearchParams(params.toString());p.set("notification",n.id);p.set("tab","notifications");router.push(`?${p.toString()}`,{scroll:false});if(!n.is_read)markRead.mutate(n.id);};
  const handleScan=async()=>{try{await scan.mutateAsync();toast.success(String(t("admin_alerts.messages.scan_success")));}catch{toast.error(String(t("admin_alerts.messages.scan_failed")));}};
  const handleResolve=async(id:string)=>{try{await resolve.mutateAsync(id);toast.success(String(t("admin_alerts.messages.resolve_success")));}catch{toast.error(String(t("admin_alerts.messages.resolve_failed")));}};
  const handleDeleteOne=async(id:string)=>{setDeletingId(id);try{await deleteOne.mutateAsync(id);setBulkSelected(p=>{const n=new Set(p);n.delete(id);return n;});toast.success("Notification deleted");await refetch();}catch{toast.error("Failed to delete");}finally{setDeletingId(null);}};
  const handleBulkDelete=async()=>{if(!bulkSelected.size)return;setBulkDeleting(true);const ids=Array.from(bulkSelected);let ok=0;try{for(const id of ids){await deleteOne.mutateAsync(id);ok++;}toast.success(`Deleted ${ok} notification${ok>1?"s":""}`);setBulkSelected(new Set());await refetch();}catch{if(ok>0){toast.success(`Deleted ${ok} of ${ids.length}`);await refetch();}toast.error("Failed to delete some");}finally{setBulkDeleting(false);}};
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">System</p><h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_alerts.title"))}</h1><p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_alerts.subtitle"))}</p></div>
        <button onClick={handleScan} disabled={scan.isPending} className="px-5 py-2.5 rounded-xl bg-[#0d0d0d] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors shrink-0">
          {scan.isPending?String(t("admin_alerts.scanning")):String(t("admin_alerts.run_scan"))}
        </button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-0.5 border-b border-[#e8e4dc]">
        {(["alerts","notifications"] as TabType[]).map(tb=>(
          <button key={tb} onClick={()=>setTab(tb)} className={`flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-bold border-b-2 transition-colors ${activeTab===tb?"border-[#0d0d0d] text-[#0d0d0d]":"border-transparent text-[#0d0d0d]/40 hover:text-[#0d0d0d]"}`}>
            {tb==="alerts"?String(t("admin_alerts.tabs.alerts")):String(t("admin_alerts.tabs.notifications"))}
            {tb==="notifications"&&notifData?.unreadCount&&notifData.unreadCount>0&&(<span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full">{notifData.unreadCount}</span>)}
          </button>
        ))}
      </motion.div>

      {activeTab==="alerts"?(
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden divide-y divide-[#e8e4dc]/60">
          {loadAlerts?([1,2,3].map(i=><div key={i} className="h-16 animate-pulse bg-[#f5f4f0]"/>)):alerts.length===0?(
            <div className="p-10 text-center"><p className="text-sm text-[#0d0d0d]/35">No alerts found.</p></div>
          ):alerts.map(al=>(
            <div key={al.id} className="flex items-center gap-4 px-5 py-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${sevStyle(al.severity)}`}>{al.severity}</span>
                  <span className="text-[10px] font-bold text-[#0d0d0d]/35 uppercase">{al.type}</span>
                </div>
                <p className="text-[13px] font-semibold text-[#0d0d0d]">{al.message}</p>
                {al.book&&<p className="text-[11px] text-[#0d0d0d]/40">{al.book.title} · {al.book.available}/{al.book.copies} available</p>}
              </div>
              <button onClick={()=>handleResolve(al.id)} disabled={al.is_resolved||resolve.isPending}
                className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-colors shrink-0 ${al.is_resolved?"border-emerald-200 text-emerald-600 cursor-default":"border-[#e8e4dc] text-[#0d0d0d]/60 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d] disabled:opacity-40"}`}>
                {al.is_resolved?String(t("admin_alerts.resolved")):String(t("admin_alerts.resolve"))}
              </button>
            </div>
          ))}
        </motion.div>
      ):(
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {/* Bulk bar */}
          {notifList.length>0&&(
            bulkSelected.size>0?(
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={()=>setBulkSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">Clear</button>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"><Trash2 size={12}/>{bulkDeleting?"Deleting…":`Delete ${bulkSelected.size}`}</button>
                </div>
              </div>
            ):(
              <button onClick={toggleAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e4dc] text-[11px] font-bold text-[#0d0d0d]/45 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 transition-colors">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected?"border-[#142b6f] bg-[#142b6f]":"border-[#e8e4dc]"}`}>
                  {allSelected&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                Select all
              </button>
            )
          )}
          {loadNotifs?([1,2,3,4].map(i=><div key={i} className="h-18 bg-white rounded-2xl border border-[#e8e4dc] animate-pulse"/>)):
          notifList.length===0?(<div className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-10 text-center"><p className="text-sm text-[#0d0d0d]/35">No notifications.</p></div>):
          notifList.map(n=>{const cfg=typeStyle(n.type);return(
            <motion.div key={n.id} variants={fadeUp} layout
              className={`w-full bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all group ${bulkSelected.has(n.id)?"border-[#142b6f] bg-[#f0f3ff]":!n.is_read?"border-[#f5c518]/50 shadow-[0_0_0_2px_rgba(245,197,24,0.1)]":"border-[#e8e4dc] hover:border-[#d8d4cc]"}`}>
              {/* Checkbox */}
              <button type="button" onClick={()=>toggleSelect(n.id)}
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${bulkSelected.has(n.id)?"border-[#142b6f] bg-[#142b6f]":"border-[#e8e4dc] group-hover:border-[#142b6f]/40"}`}>
                {bulkSelected.has(n.id)&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read?cfg.dot:"bg-[#e8e4dc]"}`}/>
              <button type="button" onClick={()=>clickNotif(n)} className="flex-1 min-w-0 text-left space-y-1">
                <div className="flex items-center gap-2 flex-wrap"><span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${cfg.badge}`}>{n.type}</span>{!n.is_read&&<span className="text-[9px] font-black text-[#f5c518] uppercase">New</span>}</div>
                <p className={`text-[13px] line-clamp-2 ${!n.is_read?"font-semibold text-[#0d0d0d]":"font-medium text-[#0d0d0d]/70"}`}>{n.message}</p>
                <p className="text-[11px] text-[#0d0d0d]/30">{new Date(n.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
              </button>
              {/* Delete */}
              <button type="button" onClick={()=>handleDeleteOne(n.id)} disabled={deletingId===n.id}
                title="Delete" className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[#0d0d0d]/25 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-30">
                {deletingId===n.id?<span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>:<Trash2 size={14}/>}
              </button>
            </motion.div>
          );})}
        </motion.div>
      )}

      <NotificationOverlay notification={active} isOpen={!!active} onClose={closeOverlay} refetch={refetch}/>
    </motion.div>
  );
}

export default function AdminAlertsPage(){return <Suspense fallback={<div className="p-6 space-y-4">{[1,2,3].map(i=><div key={i} className="h-16 bg-white rounded-xl border border-[#e8e4dc] animate-pulse"/>)}</div>}><AlertsContent/></Suspense>;}
