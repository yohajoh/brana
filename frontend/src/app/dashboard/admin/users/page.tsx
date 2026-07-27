"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  useUsers, useUserInsights, useDeleteUser, useBlockUser,
  useUnblockUser, usePromoteStudentToAdmin, useConvertAdminToStudent,
  useTransferSuperAdmin,
} from "@/lib/hooks/useQueries";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable, PortalDropdown } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.07}} };
const ITEMS   = 10;

interface User {
  id: string; name: string; email: string; role: string;
  student_id?: string | null; year?: string | null;
  phone?: string | null; is_blocked?: boolean; is_super_admin?: boolean;
}
interface UserInsights {
  user: User & { department?: string; is_confirmed?: boolean; created_at?: string };
  stats: { totalRentals:number; activeOverdue:number; returnedOnTime:number; onTimeRate:number; wishlistCount:number };
  favoriteCategories: { name:string; count:number }[];
  history: { id:string; bookTitle:string; status:string; loanDate:string; dueDate:string; returnDate?:string|null; fine:number; isLate:boolean; daysLate:number }[];
}
type ConfirmState = { title:string; description:string; confirmLabel:string; tone:"danger"|"amber"|"primary"; action:()=>Promise<void> } | null;

/* ── shared reusable pieces ────────────────────────────────── */
const IC = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all";

function Badge({ user }: { user: User }) {
  const { t } = useLanguage();
  if (user.is_blocked) return <span className="badge-chip bg-red-50 text-red-700">{String(t("admin_users.roles.blocked"))}</span>;
  if (user.is_super_admin || user.role === "SUPER_ADMIN") return <span className="badge-chip bg-amber-50 text-amber-700">{String(t("admin_users.roles.super_admin"))}</span>;
  if (user.role === "ADMIN") return <span className="badge-chip bg-[#f5f4f0] text-[#0d0d0d]">{String(t("admin_users.roles.admin"))}</span>;
  return <span className="badge-chip bg-emerald-50 text-emerald-700">{String(t("admin_users.roles.student"))}</span>;
}

/* ── confirm dialog ──────────────────────────────────────── */
function ConfirmDialog({ state, onClose, onConfirm, loading }: { state: ConfirmState; onClose:()=>void; onConfirm:()=>void; loading:boolean }) {
  if (!state) return null;
  const btnCls = state.tone === "danger" ? "bg-red-600 hover:bg-red-700 text-white"
    : state.tone === "amber" ? "bg-amber-500 hover:bg-amber-600 text-white"
    : "bg-[#0d0d0d] hover:bg-[#292524] text-white";
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[2147483647] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => !loading && onClose()}>
        <motion.div initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
          transition={{duration:0.25,ease:[0.16,1,0.3,1]}}
          className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-sm shadow-2xl"
          onClick={e => e.stopPropagation()}>
          <h3 className="text-[17px] font-serif font-black text-[#0d0d0d] mb-2">{state.title}</h3>
          <p className="text-sm text-[#0d0d0d]/55 leading-relaxed mb-6">{state.description}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/60 hover:text-[#0d0d0d] transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors ${btnCls}`}>
              {loading ? "Working…" : state.confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── user insights slide-over ──────────────────────────── */
function InsightsPanel({ user, insights, onClose }: { user: User; insights: UserInsights | null; onClose: ()=>void }) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[2147483646] bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
        onClick={onClose} />
      <motion.aside
        initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
        transition={{type:"spring",stiffness:400,damping:38}}
        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-[#e8e4dc] z-[2147483647] flex flex-col shadow-2xl overflow-hidden"
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#e8e4dc]">
          <div className="min-w-0">
            <p className="text-[16px] font-serif font-black text-[#0d0d0d] truncate">{user.name}</p>
            <p className="text-[12px] text-[#0d0d0d]/45 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors shrink-0 ml-3">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!insights ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map(i=><div key={i} className="h-12 bg-[#f0eeea] rounded-xl"/>)}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: String(t("admin_users.insights.total_rentals")),  value: insights.stats.totalRentals },
                  { label: String(t("admin_users.insights.on_time_rate")),   value: `${insights.stats.onTimeRate}%` },
                  { label: String(t("admin_users.insights.active_overdue")), value: insights.stats.activeOverdue, hi: insights.stats.activeOverdue > 0 },
                  { label: String(t("admin_users.insights.wishlist")),       value: insights.stats.wishlistCount },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3.5 ${s.hi ? "bg-red-50 border-red-100" : "bg-[#f5f4f0] border-[#e8e4dc]"}`}>
                    <p className={`text-[20px] font-serif font-black leading-none ${s.hi ? "text-red-700" : "text-[#0d0d0d]"}`}>{s.value}</p>
                    <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-wider mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Categories */}
              {insights.favoriteCategories.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-2">
                    {String(t("admin_users.insights.favorite_categories"))}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.favoriteCategories.slice(0,6).map(c => (
                      <span key={c.name} className="px-2.5 py-1 bg-[#f5f4f0] border border-[#e8e4dc] rounded-full text-[11px] font-semibold text-[#0d0d0d]">
                        {c.name} <span className="text-[#0d0d0d]/35">{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-2">
                  {String(t("admin_users.insights.borrowing_history"))}
                </p>
                {insights.history.length === 0 ? (
                  <p className="text-sm text-[#0d0d0d]/35">{String(t("admin_users.insights.history_empty"))}</p>
                ) : (
                  <div className="space-y-2">
                    {insights.history.slice(0,8).map(h => (
                      <div key={h.id} className="bg-[#f5f4f0] rounded-xl px-3.5 py-3 flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${h.isLate ? "bg-red-500" : h.status==="BORROWED" ? "bg-amber-400" : "bg-emerald-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-[#0d0d0d] truncate">{h.bookTitle}</p>
                          <p className="text-[10px] text-[#0d0d0d]/40 mt-0.5">
                            {h.isLate
                              ? String(t("admin_users.insights.late", { count: h.daysLate }))
                              : h.status === "BORROWED"
                                ? String(t("admin_users.insights.due", { date: new Date(h.dueDate).toLocaleDateString() }))
                                : String(t("admin_users.insights.on_time"))}
                          </p>
                        </div>
                        {h.fine > 0 && <span className="text-[11px] font-bold text-red-600 shrink-0">{h.fine.toFixed(1)} ETB</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

/* ── main page ─────────────────────────────────────────── */
export default function AdminUsersPage() {
  const { t }           = useLanguage();
  const { user: me }    = usePersona();
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"STUDENTS"|"ADMINS">("STUDENTS");
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<User | null>(null);
  const [openMenu, setOpenMenu]     = useState<string | null>(null);
  const [confirm, setConfirm]       = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data: usersData, isLoading, refetch: refetchUsers } = useUsers();
  const { data: insightsData }         = useUserInsights(selected?.id || "");
  const deleteUser      = useDeleteUser();
  const blockUser       = useBlockUser();
  const unblockUser     = useUnblockUser();
  const promote         = usePromoteStudentToAdmin();
  const toStudent       = useConvertAdminToStudent();
  const transferSuper   = useTransferSuperAdmin();

  const users: User[]   = usersData?.data?.users || [];
  const isSuperAdmin    = Boolean(me?.is_super_admin);
  const insights        = insightsData?.data as UserInsights | null;

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const scopeFiltered = users.filter(u =>
    isSuperAdmin
      ? tab === "ADMINS" ? u.role==="ADMIN"||u.role==="SUPER_ADMIN" : u.role==="STUDENT"
      : u.role === "STUDENT"
  );

  const filtered = scopeFiltered.filter(u => {
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.student_id?.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const paginated  = filtered.slice((page-1)*ITEMS, page*ITEMS);

  const openConfirm = (s: NonNullable<ConfirmState>) => { setOpenMenu(null); setConfirm(s); };
  const err = (e: unknown, fb: string) => e instanceof Error && e.message ? e.message : fb;

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    try { await confirm.action(); setConfirm(null); }
    finally { setConfirming(false); }
  };

  const toggleBulk = (id: string) => setBulkSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const actions = (u: User) => {
    const canManage = isSuperAdmin ? !u.is_super_admin && u.id !== me?.id : u.role==="STUDENT";
    if (!canManage) return [];
    const items: { key:string; label:string; tone:"default"|"danger"|"amber"; disabled?:boolean; onClick:()=>void }[] = [];

    items.push({ key:"block", label: u.is_blocked ? String(t("admin_users.actions.unblock")) : String(t("admin_users.actions.block")), tone:"default",
      onClick:()=>openConfirm({
        title: String(t(`admin_users.confirm.${u.is_blocked?"unblock":"block"}_title`,{name:u.name})),
        description: String(t(`admin_users.confirm.${u.is_blocked?"unblock":"block"}_desc`)),
        confirmLabel: u.is_blocked ? String(t("admin_users.actions.unblock")) : String(t("admin_users.actions.block")),
        tone:"amber",
        action: async () => {
          try {
            if (u.is_blocked) { await unblockUser.mutateAsync(u.id); toast.success(String(t("admin_users.messages.unblock_success"))); }
            else               { await blockUser.mutateAsync(u.id);   toast.success(String(t("admin_users.messages.block_success"))); }
          } catch(e) { toast.error(err(e, String(t("admin_users.messages.status_update_failed")))); throw e; }
        },
      }),
    });

    items.push({ key:"delete", label:String(t("admin_users.actions.delete")), tone:"danger",
      onClick:()=>openConfirm({
        title:String(t("admin_users.confirm.delete_title",{name:u.name})),
        description:String(t("admin_users.confirm.delete_desc")),
        confirmLabel:String(t("admin_users.actions.delete")), tone:"danger",
        action: async () => {
          try { await deleteUser.mutateAsync(u.id); toast.success(String(t("admin_users.messages.delete_success"))); setSelected(s=>s?.id===u.id?null:s); }
          catch(e) { toast.error(err(e,String(t("admin_users.messages.status_update_failed")))); throw e; }
        },
      }),
    });

    if (isSuperAdmin && u.role==="STUDENT") items.unshift({ key:"promote", label:String(t("admin_users.actions.promote")), tone:"default", disabled:Boolean(u.is_blocked),
      onClick:()=>openConfirm({ title:String(t("admin_users.confirm.promote_title",{name:u.name})), description:String(t("admin_users.confirm.promote_desc")), confirmLabel:String(t("admin_users.actions.promote")), tone:"primary",
        action:async()=>{ try{ await promote.mutateAsync(u.id); toast.success(String(t("admin_users.messages.promote_success"))); } catch(e){ toast.error(err(e,String(t("admin_users.messages.status_update_failed")))); throw e; } },
      }),
    });

    if (isSuperAdmin && u.role==="ADMIN") {
      items.unshift({ key:"to-student", label:String(t("admin_users.actions.make_student")), tone:"default", disabled:Boolean(u.is_blocked),
        onClick:()=>openConfirm({ title:String(t("admin_users.confirm.to_student_title",{name:u.name})), description:String(t("admin_users.confirm.to_student_desc")), confirmLabel:String(t("admin_users.actions.make_student")), tone:"primary",
          action:async()=>{ try{ await toStudent.mutateAsync(u.id); toast.success(String(t("admin_users.messages.to_student_success"))); } catch(e){ toast.error(err(e,String(t("admin_users.messages.status_update_failed")))); throw e; } },
        }),
      });
      items.unshift({ key:"super", label:String(t("admin_users.actions.make_super_admin")), tone:"amber", disabled:Boolean(u.is_blocked),
        onClick:()=>openConfirm({ title:String(t("admin_users.confirm.transfer_super_title",{name:u.name})), description:String(t("admin_users.confirm.transfer_super_desc")), confirmLabel:String(t("admin_users.actions.make_super_admin")), tone:"amber",
          action:async()=>{ try{ await transferSuper.mutateAsync(u.id); toast.success(String(t("admin_users.messages.transfer_success"))); window.location.reload(); } catch(e){ toast.error(err(e,String(t("admin_users.messages.status_update_failed")))); throw e; } },
        }),
      });
    }
    return items;
  };

  const deletableIds = new Set(paginated.filter(u => actions(u).some(a => a.key === "delete")).map(u => u.id));
  const allPageSelected = deletableIds.size > 0 && [...deletableIds].every(id => bulkSelected.has(id));

  const selectAllBulk = (checked: boolean) => setBulkSelected(checked
    ? new Set(paginated.filter(u => actions(u).some(a => a.key === "delete")).map(u => u.id))
    : new Set<string>());

  const handleBulkDelete = () => {
    if (!bulkSelected.size) return;
    setConfirm({
      title: `Delete ${bulkSelected.size} user${bulkSelected.size > 1 ? "s" : ""}?`,
      description: "This will permanently delete the selected users and all their data. This cannot be undone.",
      confirmLabel: `Delete ${bulkSelected.size} user${bulkSelected.size > 1 ? "s" : ""}`,
      tone: "danger",
      action: async () => {
        setBulkDeleting(true);
        const ids = Array.from(bulkSelected);
        let success = 0;
        try {
          for (const id of ids) {
            await deleteUser.mutateAsync(id);
            success++;
          }
          toast.success(`Deleted ${success} user${success > 1 ? "s" : ""}`);
          setBulkSelected(new Set());
          setSelected(s => s && bulkSelected.has(s.id) ? null : s);
          await refetchUsers();
        } catch(e) {
          if (success > 0) toast.success(`Deleted ${success} of ${ids.length} users`);
          toast.error(err(e, "Failed to delete some users"));
        } finally { setBulkDeleting(false); }
      },
    });
  };

  const cols: ColumnDef<User,unknown>[] = [
    { id:"sel", header:() => (
        <input type="checkbox" checked={allPageSelected} onChange={e => selectAllBulk(e.target.checked)}
          className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e => e.stopPropagation()} />
      ),
      cell:({row}) => {
        const canDel = actions(row.original).some(a => a.key === "delete");
        return canDel ? (
          <input type="checkbox" checked={bulkSelected.has(row.original.id)}
            onChange={() => toggleBulk(row.original.id)}
            className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e => e.stopPropagation()} />
        ) : null;
      },
    },
    { id:"name",   header:String(t("admin_users.table.name")),    cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.name}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.email}</p></div> },
    { id:"id_no",  header:String(t("admin_users.table.id_no")),   cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.student_id||"—"}</span> },
    { id:"year",   header:String(t("admin_users.table.year")),    cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.year||"—"}</span> },
    { id:"phone",  header:String(t("admin_users.table.phone_no")),cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.phone||"—"}</span> },
    { id:"status", header:String(t("admin_users.table.status")),  cell:({row})=><Badge user={row.original} /> },
    {
      id:"actions", header:"",
      cell:({row})=>{
        const u = row.original; const acts = actions(u);
        return (
          <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
            <PortalDropdown
              isOpen={openMenu===u.id}
              onClose={()=>setOpenMenu(null)}
              trigger={
                <button type="button" disabled={acts.length===0}
                  onClick={()=>setOpenMenu(c=>c===u.id?null:u.id)}
                  className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
                  <MoreHorizontal size={15}/>
                </button>
              }
            >
              {acts.length>0 && (
                <div className="min-w-[168px] bg-white rounded-xl border border-[#e8e4dc] shadow-[0_12px_36px_rgba(0,0,0,0.14)] overflow-hidden">
                  {acts.map(a=>(
                    <button key={a.key} type="button" disabled={a.disabled} onClick={a.onClick}
                      className={`flex w-full items-center px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition-colors disabled:opacity-35 ${a.tone==="danger"?"text-red-600 hover:bg-red-50":a.tone==="amber"?"text-amber-700 hover:bg-amber-50":"text-[#0d0d0d] hover:bg-[#f5f4f0]"}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </PortalDropdown>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <style>{`.badge-chip{display:inline-flex;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase}`}</style>

      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-6" onClick={()=>setOpenMenu(null)}>

        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
            <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_users.title"))}</h1>
            <p className="text-sm text-[#0d0d0d]/45 mt-1">{isSuperAdmin ? String(t("admin_users.subtitle_super")) : String(t("admin_users.subtitle_admin"))}</p>
          </div>
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
            <input type="text" value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder={String(t("admin_users.search_placeholder"))}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white text-[#0d0d0d] placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/>
          </div>
        </motion.div>

        {/* Tab switcher — super admin only */}
        {isSuperAdmin && (
          <motion.div variants={fadeUp} className="flex gap-1 p-1 bg-white rounded-xl border border-[#e8e4dc] w-fit">
            {(["STUDENTS","ADMINS"] as const).map(tb=>(
              <button key={tb} onClick={()=>{setTab(tb);setPage(1);}}
                className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all ${tab===tb?"bg-[#0d0d0d] text-white shadow-sm":"text-[#0d0d0d]/50 hover:text-[#0d0d0d]"}`}>
                {tb==="STUDENTS" ? String(t("admin_users.tabs.students")) : String(t("admin_users.tabs.admins"))}
              </button>
            ))}
          </motion.div>
        )}

        {/* Bulk delete bar */}
        {bulkSelected.size > 0 && (
          <motion.div variants={fadeUp}
            className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-[12px] font-bold text-red-700">
              {bulkSelected.size} user{bulkSelected.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <button onClick={() => setBulkSelected(new Set())}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                Clear
              </button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                Delete {bulkSelected.size}
              </button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          <TanStackTable data={paginated} columns={cols} isLoading={isLoading}
            emptyText={String(t("admin_users.table.no_users"))} skeletonRows={6}
            rowClassName="cursor-pointer" onRowClick={u=>setSelected(u)} />
        </motion.div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              <ChevronLeft size={14}/> {String(t("common.pagination.previous"))}
            </button>
            <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              {String(t("common.pagination.next"))} <ChevronRight size={14}/>
            </button>
          </motion.div>
        )}
      </motion.div>

      {selected && <InsightsPanel user={selected} insights={insights} onClose={()=>setSelected(null)} />}
      <ConfirmDialog state={confirm} onClose={()=>setConfirm(null)} onConfirm={handleConfirm} loading={confirming} />
    </>
  );
}
