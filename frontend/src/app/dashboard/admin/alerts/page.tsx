"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAllNotifications, useMarkAsRead, type Notification } from "@/lib/hooks/useNotifications";
import { NotificationOverlay } from "@/components/notifications/NotificationOverlay";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.06}}};

type Alert={id:string;type:string;severity:string;message:string;is_resolved:boolean;created_at:string;book:{title:string;available:number;copies:number}};
type TabType="alerts"|"notifications";

function useInventoryAlerts(){return useQuery({queryKey:["inventory-alerts"],queryFn:()=>fetchApi<{alerts?:Alert[];data?:{alerts?:Alert[]}}>("/admin/inventory-alerts?limit=200"),staleTime:60000});}

function useResolveAlert(){
  const qc=useQueryClient();
  return useMutation({
    mutationFn:(id:string)=>fetchApi(`/admin/inventory-alerts/${id}/resolve`,{method:"PATCH"}),
    onMutate:async(id)=>{
      await qc.cancelQueries({queryKey:["inventory-alerts"]});
      const prev=qc.getQueriesData<{alerts?:Alert[];data?:{alerts?:Alert[]}}>({queryKey:["inventory-alerts"]});
      qc.setQueriesData<{alerts?:Alert[];data?:{alerts?:Alert[]}}>({queryKey:["inventory-alerts"]},old=>{
        if(!old)return old;
        const al=old.alerts||old.data?.alerts||[];
        const upd=al.map(a=>a.id===id?{...a,is_resolved:true}:a);
        return old.alerts?{...old,alerts:upd}:{...old,data:{...(old.data||{}),alerts:upd}};
      });
      return{prev};
    },
    onError:(_,__,ctx)=>{ctx?.prev?.forEach(([k,d])=>qc.setQueryData(k,d));},
    onSuccess:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]}),
  });
}

function useScanAlerts(){
  const qc=useQueryClient();
  return useMutation({mutationFn:()=>fetchApi("/admin/inventory-alerts/scan",{method:"POST"}),onSettled:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]})});
}

function useDeleteAlert(){
  const qc=useQueryClient();
  return useMutation({mutationFn:(id:string)=>fetchApi(`/admin/inventory-alerts/${id}`,{method:"DELETE"}),onSettled:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]})});
}

function useBulkDeleteAlerts(){
  const qc=useQueryClient();
  return useMutation({
    mutationFn:(ids:string[])=>fetchApi("/admin/inventory-alerts",{method:"DELETE"} as Parameters<typeof fetchApi>[1]),
    onSettled:()=>qc.invalidateQueries({queryKey:["inventory-alerts"]}),
  });
}

const typeStyle=(type:string)=>{switch(type){case "ALERT":case "OVERDUE":return{dot:"bg-red-500",badge:"bg-red-50 text-red-700 border-red-100"};case "REMINDER":return{dot:"bg-amber-400",badge:"bg-amber-50 text-amber-700 border-amber-100"};case "NEW_BOOK":return{dot:"bg-emerald-500",badge:"bg-emerald-50 text-emerald-700 border-emerald-100"};default:return{dot:"bg-[#0d0d0d]/20",badge:"bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]"};}};
const sevStyle=(s:string)=>{switch(s){case "CRITICAL":return"bg-red-50 text-red-700 border-red-100";case "HIGH":return"bg-orange-50 text-orange-700 border-orange-100";case "MEDIUM":return"bg-amber-50 text-amber-700 border-amber-100";default:return"bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]";}};

function AlertsContent() {
  const { t }=useLanguage();
  const router=useRouter();
  const params=useSearchParams();
  const notifId=params.get("notification");
  const activeTab=(params.get("tab") as TabType)||"alerts";

  // Data hooks
  const {data:alertsData,isLoading:loadAlerts}=useInventoryAlerts();
  const {data:notifData,isLoading:loadNotifs,refetch}=useAllNotifications({limit:100});
  const resolve=useResolveAlert();
  const scan=useScanAlerts();
  const markRead=useMarkAsRead();
  const deleteAlertMutation=useDeleteAlert();
  const bulkDelAlertMutation=useBulkDeleteAlerts();

  // Derived data — declared BEFORE any usage
  const alerts:Alert[]=alertsData?.alerts||alertsData?.data?.alerts||[];
  const notifList=notifData?.notifications||[];

  // Alert selection state
  const [alertSelected,setAlertSelected]=useState<Set<string>>(new Set());
  const [alertBulkDeleting,setAlertBulkDeleting]=useState(false);
  const [deletingAlertId,setDeletingAlertId]=useState<string|null>(null);
  const allAlertsSelected=alerts.length>0&&alerts.every(a=>alertSelected.has(a.id));
  const toggleAlert=(id:string)=>setAlertSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  // Notification selection state
  const [notifSelected,setNotifSelected]=useState<Set<string>>(new Set());
  const [notifBulkDeleting,setNotifBulkDeleting]=useState(false);
  const [deletingNotifId,setDeletingNotifId]=useState<string|null>(null);
  const allNotifsSelected=notifList.length>0&&notifList.every(n=>notifSelected.has(n.id));
  const toggleNotif=(id:string)=>setNotifSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  // Active overlay
  const active=useMemo(()=>{
    if(!notifId||!notifData?.notifications)return null;
    return notifData.notifications.find(n=>n.id===notifId)||null;
  },[notifId,notifData]);

  // Navigation helpers
  const setTab=(tab:TabType)=>{const p=new URLSearchParams(params.toString());p.set("tab",tab);router.push(`?${p.toString()}`,{scroll:false});};
  const closeOverlay=()=>{const p=new URLSearchParams(params.toString());p.delete("notification");router.replace(`?${p.toString()}`,{scroll:false});};
  const clickNotif=(n:Notification)=>{const p=new URLSearchParams(params.toString());p.set("notification",n.id);p.set("tab","notifications");router.push(`?${p.toString()}`,{scroll:false});if(!n.is_read)markRead.mutate(n.id);};

  // Alert handlers
  const handleScan=async()=>{try{await scan.mutateAsync();toast.success(String(t("admin_alerts.messages.scan_success")));}catch{toast.error(String(t("admin_alerts.messages.scan_failed")));}};
  const handleResolve=async(id:string)=>{try{await resolve.mutateAsync(id);toast.success(String(t("admin_alerts.messages.resolve_success")));}catch{toast.error(String(t("admin_alerts.messages.resolve_failed")));}};

  const handleDeleteOneAlert=async(id:string)=>{
    setDeletingAlertId(id);
    try{await deleteAlertMutation.mutateAsync(id);setAlertSelected(p=>{const n=new Set(p);n.delete(id);return n;});toast.success("Alert deleted");}
    catch(e){toast.error(e instanceof Error?e.message:"Failed to delete alert");}
    finally{setDeletingAlertId(null);}
  };

  const handleBulkDeleteAlerts=async()=>{
    if(!alertSelected.size)return;
    setAlertBulkDeleting(true);
    const ids=Array.from(alertSelected);
    let ok=0;
    try{
      for(const id of ids){await deleteAlertMutation.mutateAsync(id);ok++;}
      toast.success(`Deleted ${ok} alert${ok>1?"s":""}`);
      setAlertSelected(new Set());
    }catch(e){
      if(ok>0)toast.success(`Deleted ${ok} of ${ids.length}`);
      toast.error(e instanceof Error?e.message:"Failed to delete some alerts");
    }finally{setAlertBulkDeleting(false);}
  };

  // Notification handlers — direct fetchApi to avoid optimistic-update races
  const handleDeleteOneNotif=async(id:string)=>{
    setDeletingNotifId(id);
    try{
      await fetchApi(`/notifications/${id}`,{method:"DELETE"});
      setNotifSelected(p=>{const n=new Set(p);n.delete(id);return n;});
      toast.success("Notification deleted");
      await refetch();
    }catch(e){toast.error(e instanceof Error?e.message:"Failed to delete");}
    finally{setDeletingNotifId(null);}
  };

  const handleBulkDeleteNotifs=async()=>{
    if(!notifSelected.size)return;
    setNotifBulkDeleting(true);
    const ids=Array.from(notifSelected);
    let ok=0;
    try{
      for(const id of ids){await fetchApi(`/notifications/${id}`,{method:"DELETE"});ok++;}
      toast.success(`Deleted ${ok} notification${ok>1?"s":""}`);
      setNotifSelected(new Set());
      await refetch();
    }catch(e){
      if(ok>0){toast.success(`Deleted ${ok} of ${ids.length}`);await refetch();}
      toast.error(e instanceof Error?e.message:"Failed to delete some");
    }finally{setNotifBulkDeleting(false);}
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      {/* Header */}
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
            {tb==="notifications"&&(notifData?.unreadCount??0)>0&&<span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full">{notifData!.unreadCount}</span>}
          </button>
        ))}
      </motion.div>

      {/* ── ALERTS TAB ─────────────────────────────────── */}
      {activeTab==="alerts"&&(
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {/* Select/bulk bar */}
          {alerts.length>0&&(alertSelected.size>0?(
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="text-[12px] font-bold text-red-700">{alertSelected.size} selected</span>
              <div className="flex gap-2">
                <button onClick={()=>setAlertSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">Clear</button>
                <button onClick={handleBulkDeleteAlerts} disabled={alertBulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  <Trash2 size={12}/>{alertBulkDeleting?"Deleting…":`Delete ${alertSelected.size}`}
                </button>
              </div>
            </div>
          ):(
            <button onClick={()=>setAlertSelected(allAlertsSelected?new Set():new Set(alerts.map(a=>a.id)))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e4dc] text-[11px] font-bold text-[#0d0d0d]/45 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 transition-colors">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allAlertsSelected?"border-[#142b6f] bg-[#142b6f]":"border-[#e8e4dc]"}`}>
                {allAlertsSelected&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              Select all
            </button>
          ))}
