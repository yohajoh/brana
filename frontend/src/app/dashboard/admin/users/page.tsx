"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, MoreHorizontal, ShieldAlert, Award } from "lucide-react";
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
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.07}} };
const ITEMS   = 10;

type StandingFilter = "ALL" | "GOOD_STANDING" | "YELLOW_FLAG" | "RED_FLAG" | "SUSPENDED";

interface User {
  id: string; name: string; email: string; role: string;
  student_id?: string | null; year?: string | null;
  phone?: string | null; is_blocked?: boolean; is_super_admin?: boolean;
  trust_score?: number | null;
  standing?: "GOOD_STANDING" | "YELLOW_FLAG" | "RED_FLAG" | "SUSPENDED" | null;
}
interface UserInsights {
  user: User & { department?: string; is_confirmed?: boolean; created_at?: string; max_concurrent_loans_override?: number | null; standing_note?: string | null };
  stats: { totalRentals:number; activeOverdue:number; returnedOnTime:number; onTimeRate:number; wishlistCount:number; incidentCount?:number; totalDamagePenalty?:number; pendingDamagePenalty?:number };
  favoriteCategories: { name:string; count:number }[];
  history: { id:string; bookTitle:string; copyCode?:string; status:string; loanDate:string; dueDate:string; returnDate?:string|null; fine:number; isLate:boolean; daysLate:number; outgoingCondition?:string; returnedCondition?:string|null; hasDamageIncident?:boolean }[];
  damageIncidents?: any[];
}
type ConfirmState = { title:string; description:string; confirmLabel:string; tone:"danger"|"amber"|"primary"; action:()=>Promise<void> } | null;

/* ── standing helpers ────────────────────────────────────── */
type Standing = "GOOD_STANDING" | "YELLOW_FLAG" | "RED_FLAG" | "SUSPENDED";

const standingMeta: Record<Standing, { label: string; chip: string; dot: string }> = {
  GOOD_STANDING: { label: "Good",      chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  YELLOW_FLAG:   { label: "Warning",   chip: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400"  },
  RED_FLAG:      { label: "Red Flag",  chip: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500" },
  SUSPENDED:     { label: "Suspended", chip: "bg-rose-50 text-rose-700 border-rose-200",           dot: "bg-rose-600"   },
};

function StandingBadge({ standing }: { standing?: Standing | null }) {
  if (!standing) return <span className="text-[11px] text-[#0d0d0d]/30">—</span>;
  const m = standingMeta[standing];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${m.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

function TrustMeter({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-[11px] text-[#0d0d0d]/30">—</span>;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[72px]">
      <div className="flex-1 h-1.5 bg-[#e8e4dc] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums text-[#0d0d0d]/60 shrink-0">{score}</span>
    </div>
  );
}

function Badge({ user }: { user: User }) {
  const { t } = useLanguage();
  if (user.is_blocked) return <span className="badge-chip bg-red-50 text-red-700">{String(t("admin_users.roles.blocked"))}</span>;
  if (user.is_super_admin || user.role === "SUPER_ADMIN") return <span className="badge-chip bg-amber-50 text-amber-700">{String(t("admin_users.roles.super_admin"))}</span>;
  if (user.role === "ADMIN") return <span className="badge-chip bg-[#f5f4f0] text-[#0d0d0d]">{String(t("admin_users.roles.admin"))}</span>;
  return <span className="badge-chip bg-emerald-50 text-emerald-700">{String(t("admin_users.roles.student"))}</span>;
}

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

import { useModerateUserStanding, useUpdateDamagePenalty, UserStanding } from "@/lib/hooks/useQueries";

function ConditionPill({ cond }: { cond?: string | null }) {
  if (!cond || cond === "N/A") return <span className="text-[#0d0d0d]/30 text-[10px]">—</span>;
  const map: Record<string, string> = {
    NEW: "bg-sky-50 text-sky-700", GOOD: "bg-emerald-50 text-emerald-700",
    WORN: "bg-amber-50 text-amber-700", DAMAGED: "bg-rose-50 text-rose-700", LOST: "bg-red-100 text-red-800",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${map[cond] ?? "bg-gray-100 text-gray-600"}`}>{cond}</span>;
}

function InsightsPanel({ user, insights, onClose }: { user: User; insights: any | null; onClose: () => void }) {
  const { t } = useLanguage();
  const moderateStanding = useModerateUserStanding();
  const updatePenalty = useUpdateDamagePenalty();
  const [showModerationForm, setShowModerationForm] = useState(false);
  const [selectedStanding, setSelectedStanding] = useState<UserStanding>(insights?.user?.standing || "GOOD_STANDING");
  const [standingNote, setStandingNote] = useState("");
  const [isBlockedToggle, setIsBlockedToggle] = useState(Boolean(insights?.user?.is_blocked));
  const [loanOverride, setLoanOverride] = useState<number | undefined>(insights?.user?.max_concurrent_loans_override || undefined);

  const trustScore = insights?.user?.trust_score ?? 100;
  const currentStanding: UserStanding = insights?.user?.standing || "GOOD_STANDING";
  const sm = standingMeta[currentStanding as Standing] ?? standingMeta.GOOD_STANDING;

  const handleStandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standingNote.trim()) { toast.error("Moderation note is required."); return; }
    try {
      await moderateStanding.mutateAsync({ userId: user.id, standing: selectedStanding, standing_note: standingNote.trim(), is_blocked: isBlockedToggle, max_concurrent_loans_override: loanOverride ? Number(loanOverride) : null });
      toast.success("User standing updated!");
      setShowModerationForm(false); setStandingNote("");
    } catch (err: any) { toast.error(err?.message || "Failed to update standing."); }
  };

  const handleResolvePenalty = async (incidentId: string, penalty_status: "PAID" | "WAIVED") => {
    try { await updatePenalty.mutateAsync({ incidentId, penalty_status }); toast.success(`Penalty marked ${penalty_status.toLowerCase()}.`); }
    catch (err: any) { toast.error(err?.message || "Failed to update penalty."); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[2147483646] bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" onClick={onClose} />
      <motion.aside initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
        transition={{type:"spring",stiffness:400,damping:38}}
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white border-l border-[#e8e4dc] z-[2147483647] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-[#e8e4dc] bg-[#faf9f6]">
          <div className="min-w-0">
            <p className="text-[17px] font-serif font-black text-[#0d0d0d] truncate">{user.name}</p>
            <p className="text-[12px] text-[#0d0d0d]/45 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] shrink-0 ml-3"><X size={15}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!insights ? (
            <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i=><div key={i} className="h-12 bg-[#f0eeea] rounded-xl"/>)}</div>
          ) : (
            <>
              {/* Trust Score Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#142b6f] to-[#0e1f52] text-white space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400"/>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/80">Borrower Trust Profile</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${sm.chip}`}>{sm.label}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div><span className="text-3xl font-serif font-black">{trustScore}</span><span className="text-sm text-white/60 font-mono"> / 100</span></div>
                  <button onClick={()=>{setSelectedStanding(currentStanding);setShowModerationForm(!showModerationForm);}}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/20 transition-all">
                    Moderate Standing
                  </button>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${trustScore>=70?"bg-emerald-400":trustScore>=40?"bg-amber-400":"bg-rose-500"}`} style={{width:`${Math.max(0,Math.min(100,trustScore))}%`}}/>
                </div>
                {insights.user?.standing_note && <p className="text-[11px] text-white/70 italic border-t border-white/10 pt-2">"{insights.user.standing_note}"</p>}
              </div>

              {/* Moderation Form */}
              {showModerationForm && (
                <form onSubmit={handleStandingSubmit} className="p-4 bg-[#f8f7f4] border border-[#e8e4dc] rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#e8e4dc] pb-2">
                    <ShieldAlert className="w-4 h-4 text-[#142b6f]"/>
                    <h4 className="text-[12px] font-black text-[#142b6f] uppercase tracking-wider">Admin Standing Override</h4>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Risk Standing</label>
                    <select value={selectedStanding} onChange={e=>setSelectedStanding(e.target.value as UserStanding)} className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-white font-semibold">
                      <option value="GOOD_STANDING">GOOD_STANDING — Full Access</option>
                      <option value="YELLOW_FLAG">YELLOW_FLAG — Warning / 1-book cap</option>
                      <option value="RED_FLAG">RED_FLAG — Strict 1-Book Cap</option>
                      <option value="SUSPENDED">SUSPENDED — Borrowing Blocked</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Max Loans Override</label>
                    <input type="number" min={0} max={10} value={loanOverride??""} onChange={e=>setLoanOverride(e.target.value?Number(e.target.value):undefined)} placeholder="Default" className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-white"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Reason / Note <span className="text-red-500">*</span></label>
                    <textarea rows={2} value={standingNote} onChange={e=>setStandingNote(e.target.value)} placeholder="Audit justification..." required className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-white resize-none"/>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isBlockedToggle} onChange={e=>setIsBlockedToggle(e.target.checked)} className="w-4 h-4 accent-rose-600 rounded"/>
                    <span className="text-[11px] font-semibold text-[#0d0d0d]/80">Block account from portal</span>
                  </label>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={()=>setShowModerationForm(false)} className="px-3.5 py-2 rounded-xl bg-white border border-[#e8e4dc] text-[11px] font-bold text-[#0d0d0d]/70">Cancel</button>
                    <button type="submit" disabled={moderateStanding.isPending} className="px-4 py-2 rounded-xl bg-[#142b6f] text-white text-[11px] font-bold disabled:opacity-50 hover:bg-[#0e1f52]">
                      {moderateStanding.isPending?"Saving...":"Apply Change"}
                    </button>
                  </div>
                </form>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:String(t("admin_users.insights.total_rentals")),value:insights.stats.totalRentals},
                  {label:String(t("admin_users.insights.on_time_rate")),value:`${insights.stats.onTimeRate}%`},
                  {label:String(t("admin_users.insights.active_overdue")),value:insights.stats.activeOverdue,hi:insights.stats.activeOverdue>0},
                  {label:"Damage Incidents",value:insights.stats.incidentCount||0,hi:(insights.stats.incidentCount||0)>0},
                ].map(s=>(
                  <div key={s.label} className={`rounded-xl border p-3.5 ${s.hi?"bg-red-50 border-red-100":"bg-[#f5f4f0] border-[#e8e4dc]"}`}>
                    <p className={`text-[20px] font-serif font-black leading-none ${s.hi?"text-red-700":"text-[#0d0d0d]"}`}>{s.value}</p>
                    <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-wider mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Damage Incidents Log */}
              {insights.damageIncidents && insights.damageIncidents.length>0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-[0.18em]">Damage Liability Log ({insights.damageIncidents.length})</p>
                  <div className="space-y-2">
                    {insights.damageIncidents.map((inc:any)=>(
                      <div key={inc.id} className="p-3.5 bg-white border border-rose-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[12px]">
                          <div className="min-w-0">
                            <p className="font-bold text-[#0d0d0d] truncate">{inc.copy?.book?.title||"Book Copy"}</p>
                            {inc.copy?.copy_code&&<p className="text-[10px] font-mono text-[#0d0d0d]/40 mt-0.5">{inc.copy.copy_code}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ml-2 ${inc.penalty_status==="PAID"?"bg-emerald-50 text-emerald-700":inc.penalty_status==="WAIVED"?"bg-gray-100 text-gray-600":"bg-rose-50 text-rose-700"}`}>{inc.penalty_status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#0d0d0d]/60">
                          <ConditionPill cond={inc.outgoing_condition}/>
                          <span className="text-[#0d0d0d]/30">→</span>
                          <ConditionPill cond={inc.returned_condition}/>
                          <span className="flex-1"/>
                          <span className="font-bold">{inc.damage_type?.replace(/_/g," ")}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#0d0d0d]/50">
                          <span>Fee: <strong className="text-rose-600">{Number(inc.penalty_amount).toFixed(2)} ETB</strong></span>
                          <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                        </div>
                        {inc.notes&&<p className="text-[10px] text-[#0d0d0d]/50 italic border-t border-gray-100 pt-1.5">{inc.notes}</p>}
                        {inc.penalty_status==="PENDING"&&(
                          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                            <button onClick={()=>handleResolvePenalty(inc.id,"WAIVED")} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Waive Fee</button>
                            <button onClick={()=>handleResolvePenalty(inc.id,"PAID")} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Mark Paid</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rental & Copy Custody History */}
              <div>
                <p className="text-[10px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em] mb-3">{String(t("admin_users.insights.borrowing_history"))}</p>
                {insights.history.length===0 ? (
                  <p className="text-sm text-[#0d0d0d]/35">{String(t("admin_users.insights.history_empty"))}</p>
                ) : (
                  <div className="space-y-2">
                    {insights.history.slice(0,10).map((h:any)=>(
                      <div key={h.id} className={`rounded-xl border px-3.5 py-3 space-y-2 ${h.hasDamageIncident?"bg-rose-50 border-rose-100":"bg-[#f5f4f0] border-[#e8e4dc]"}`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${h.isLate?"bg-red-500":h.status==="BORROWED"?"bg-amber-400":"bg-emerald-500"}`}/>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-[#0d0d0d] truncate">{h.bookTitle}</p>
                            {h.copyCode&&h.copyCode!=="N/A"&&<p className="text-[10px] font-mono text-[#0d0d0d]/40 mt-0.5">{h.copyCode}</p>}
                          </div>
                          {h.fine>0&&<span className="text-[11px] font-bold text-red-600 shrink-0">{h.fine.toFixed(1)} ETB</span>}
                          {h.hasDamageIncident&&<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">Incident</span>}
                        </div>
                        <div className="flex items-center gap-2 pl-4">
                          <span className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-wider">Issued</span>
                          <ConditionPill cond={h.outgoingCondition}/>
                          <span className="text-[#0d0d0d]/25 text-[10px]">→</span>
                          <span className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-wider">Returned</span>
                          <ConditionPill cond={h.returnedCondition}/>
                          {h.isLate&&<span className="ml-auto text-[9px] font-extrabold text-red-500 shrink-0">{h.daysLate}d late</span>}
                        </div>
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
  const { t }        = useLanguage();
  const { user: me } = usePersona();
  const [search, setSearch]                 = useState("");
  const [tab, setTab]                       = useState<"STUDENTS"|"ADMINS">("STUDENTS");
  const [standingFilter, setStandingFilter] = useState<StandingFilter>("ALL");
  const [page, setPage]                     = useState(1);
  const [selected, setSelected]             = useState<User | null>(null);
  const [openMenu, setOpenMenu]             = useState<string | null>(null);
  const [confirm, setConfirm]               = useState<ConfirmState>(null);
  const [confirming, setConfirming]         = useState(false);
  const [bulkSelected, setBulkSelected]     = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting]     = useState(false);

  const { data: usersData, isLoading, refetch: refetchUsers } = useUsers();
  const { data: insightsData } = useUserInsights(selected?.id || "");
  const deleteUser    = useDeleteUser();
  const blockUser     = useBlockUser();
  const unblockUser   = useUnblockUser();
  const promote       = usePromoteStudentToAdmin();
  const toStudent     = useConvertAdminToStudent();
  const transferSuper = useTransferSuperAdmin();

  const users: User[] = usersData?.data?.users || [];
  const isSuperAdmin  = Boolean(me?.is_super_admin);
  const insights      = insightsData?.data as UserInsights | null;

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const scopeFiltered = users.filter(u =>
    isSuperAdmin ? (tab==="ADMINS" ? u.role==="ADMIN"||u.role==="SUPER_ADMIN" : u.role==="STUDENT") : u.role==="STUDENT"
  );

  const standingFiltered = standingFilter==="ALL" ? scopeFiltered : scopeFiltered.filter(u=>u.standing===standingFilter);

  const filtered = standingFiltered.filter(u =>
    matchesMultiLangQuery(u.name,search) || matchesMultiLangQuery(u.email,search) ||
    matchesMultiLangQuery(u.student_id,search) || matchesMultiLangQuery(u.phone,search) || matchesMultiLangQuery(u.role,search)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const paginated  = filtered.slice((page-1)*ITEMS, page*ITEMS);

  const openConfirm = (s: NonNullable<ConfirmState>) => { setOpenMenu(null); setConfirm(s); };
  const err = (e: unknown, fb: string) => e instanceof Error && e.message ? e.message : fb;
  const handleConfirm = async () => {
    if (!confirm) return; setConfirming(true);
    try { await confirm.action(); setConfirm(null); } finally { setConfirming(false); }
  };
  const toggleBulk = (id: string) => setBulkSelected(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  const actions = (u: User) => {
    const canManage = isSuperAdmin ? !u.is_super_admin && u.id!==me?.id : u.role==="STUDENT";
    if (!canManage) return [];
    const items: { key:string; label:string; tone:"default"|"danger"|"amber"; disabled?:boolean; onClick:()=>void }[] = [];

    items.push({ key:"block", label: u.is_blocked?String(t("admin_users.actions.unblock")):String(t("admin_users.actions.block")), tone:"default",
      onClick:()=>openConfirm({ title:String(t(`admin_users.confirm.${u.is_blocked?"unblock":"block"}_title`,{name:u.name})), description:String(t(`admin_users.confirm.${u.is_blocked?"unblock":"block"}_desc`)), confirmLabel:u.is_blocked?String(t("admin_users.actions.unblock")):String(t("admin_users.actions.block")), tone:"amber",
        action:async()=>{ try{ if(u.is_blocked){await unblockUser.mutateAsync(u.id);toast.success(String(t("admin_users.messages.unblock_success")));}else{await blockUser.mutateAsync(u.id);toast.success(String(t("admin_users.messages.block_success")));} }catch(e){toast.error(err(e,String(t("admin_users.messages.status_update_failed"))));throw e;} },
      }),
    });
    items.push({ key:"delete", label:String(t("admin_users.actions.delete")), tone:"danger",
      onClick:()=>openConfirm({ title:String(t("admin_users.confirm.delete_title",{name:u.name})), description:String(t("admin_users.confirm.delete_desc")), confirmLabel:String(t("admin_users.actions.delete")), tone:"danger",
        action:async()=>{ try{await deleteUser.mutateAsync(u.id);toast.success(String(t("admin_users.messages.delete_success")));setSelected(s=>s?.id===u.id?null:s);}catch(e){toast.error(err(e,String(t("admin_users.messages.status_update_failed"))));throw e;} },
      }),
    });
    if (isSuperAdmin&&u.role==="STUDENT") items.unshift({ key:"promote", label:String(t("admin_users.actions.promote")), tone:"default", disabled:Boolean(u.is_blocked),
      onClick:()=>openConfirm({ title:String(t("admin_users.confirm.promote_title",{name:u.name})), description:String(t("admin_users.confirm.promote_desc")), confirmLabel:String(t("admin_users.actions.promote")), tone:"primary",
        action:async()=>{ try{await promote.mutateAsync(u.id);toast.success(String(t("admin_users.messages.promote_success")));}catch(e){toast.error(err(e,String(t("admin_users.messages.status_update_failed"))));throw e;} },
      }),
    });
    if (isSuperAdmin&&u.role==="ADMIN") {
      items.unshift({ key:"to-student", label:String(t("admin_users.actions.make_student")), tone:"default", disabled:Boolean(u.is_blocked),
        onClick:()=>openConfirm({ title:String(t("admin_users.confirm.to_student_title",{name:u.name})), description:String(t("admin_users.confirm.to_student_desc")), confirmLabel:String(t("admin_users.actions.make_student")), tone:"primary",
          action:async()=>{ try{await toStudent.mutateAsync(u.id);toast.success(String(t("admin_users.messages.to_student_success")));}catch(e){toast.error(err(e,String(t("admin_users.messages.status_update_failed"))));throw e;} },
        }),
      });
      items.unshift({ key:"super", label:String(t("admin_users.actions.make_super_admin")), tone:"amber", disabled:Boolean(u.is_blocked),
        onClick:()=>openConfirm({ title:String(t("admin_users.confirm.transfer_super_title",{name:u.name})), description:String(t("admin_users.confirm.transfer_super_desc")), confirmLabel:String(t("admin_users.actions.make_super_admin")), tone:"amber",
          action:async()=>{ try{await transferSuper.mutateAsync(u.id);toast.success(String(t("admin_users.messages.transfer_success")));window.location.reload();}catch(e){toast.error(err(e,String(t("admin_users.messages.status_update_failed"))));throw e;} },
        }),
      });
    }
    return items;
  };

  const deletableIds    = new Set(paginated.filter(u=>actions(u).some(a=>a.key==="delete")).map(u=>u.id));
  const allPageSelected = deletableIds.size>0 && [...deletableIds].every(id=>bulkSelected.has(id));
  const selectAllBulk   = (checked: boolean) => setBulkSelected(checked ? new Set(paginated.filter(u=>actions(u).some(a=>a.key==="delete")).map(u=>u.id)) : new Set<string>());

  const handleBulkDelete = () => {
    if (!bulkSelected.size) return;
    setConfirm({ title:`Delete ${bulkSelected.size} user${bulkSelected.size>1?"s":""}?`, description:"Permanently delete selected users and all their data. Cannot be undone.", confirmLabel:`Delete ${bulkSelected.size}`, tone:"danger",
      action:async()=>{ setBulkDeleting(true); const ids=Array.from(bulkSelected); let ok=0;
        try{ for(const id of ids){await deleteUser.mutateAsync(id);ok++;}
          toast.success(`Deleted ${ok} user${ok>1?"s":""}`); setBulkSelected(new Set()); setSelected(s=>s&&bulkSelected.has(s.id)?null:s); await refetchUsers();
        }catch(e){ if(ok>0){toast.success(`Deleted ${ok} of ${ids.length}`);await refetchUsers();} toast.error(err(e,"Failed to delete some users")); }
        finally{setBulkDeleting(false);}
      },
    });
  };

  const cols: ColumnDef<User,unknown>[] = [
    { id:"sel", header:()=><input type="checkbox" checked={allPageSelected} onChange={e=>selectAllBulk(e.target.checked)} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>,
      cell:({row})=>{ const canDel=actions(row.original).some(a=>a.key==="delete"); return canDel?<input type="checkbox" checked={bulkSelected.has(row.original.id)} onChange={()=>toggleBulk(row.original.id)} className="w-4 h-4 rounded border-[#e8e4dc] accent-[#142b6f]" onClick={e=>e.stopPropagation()}/>:null; },
    },
    { id:"name",    header:String(t("admin_users.table.name")),     cell:({row})=><div><p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.name}</p><p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.email}</p></div> },
    { id:"id_no",   header:String(t("admin_users.table.id_no")),    cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.student_id||"—"}</span> },
    { id:"year",    header:String(t("admin_users.table.year")),     cell:({row})=><span className="text-[12px] text-[#0d0d0d]/50">{row.original.year||"—"}</span> },
    { id:"trust",   header:"Trust",    cell:({row})=><TrustMeter score={row.original.trust_score}/> },
    { id:"standing",header:"Standing", cell:({row})=><StandingBadge standing={row.original.standing as Standing|null|undefined}/> },
    { id:"status",  header:String(t("admin_users.table.status")),   cell:({row})=><Badge user={row.original}/> },
    { id:"actions", header:"",
      cell:({row})=>{ const u=row.original; const acts=actions(u);
        return (
          <div className="flex justify-end" onClick={e=>e.stopPropagation()}>
            <PortalDropdown isOpen={openMenu===u.id} onClose={()=>setOpenMenu(null)}
              trigger={<button type="button" disabled={acts.length===0} onClick={()=>setOpenMenu(c=>c===u.id?null:u.id)} className="w-8 h-8 rounded-xl border border-[#e8e4dc] bg-white flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"><MoreHorizontal size={15}/></button>}>
              {acts.length>0&&<div className="min-w-[168px] bg-white rounded-xl border border-[#e8e4dc] shadow-[0_12px_36px_rgba(0,0,0,0.14)] overflow-hidden">
                {acts.map(a=><button key={a.key} type="button" disabled={a.disabled} onClick={a.onClick} className={`flex w-full items-center px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition-colors disabled:opacity-35 ${a.tone==="danger"?"text-red-600 hover:bg-red-50":a.tone==="amber"?"text-amber-700 hover:bg-amber-50":"text-[#0d0d0d] hover:bg-[#f5f4f0]"}`}>{a.label}</button>)}
              </div>}
            </PortalDropdown>
          </div>
        );
      },
    },
  ];

  /* standing filter counts */
  const standingCounts = (["ALL","GOOD_STANDING","YELLOW_FLAG","RED_FLAG","SUSPENDED"] as StandingFilter[]).reduce((acc,s)=>{ acc[s]=s==="ALL"?scopeFiltered.length:scopeFiltered.filter(u=>u.standing===s).length; return acc; },{} as Record<StandingFilter,number>);
  const filterLabels:  Record<StandingFilter,string> = { ALL:"All", GOOD_STANDING:"Good", YELLOW_FLAG:"Warning", RED_FLAG:"Red Flag", SUSPENDED:"Suspended" };
  const filterColors:  Record<StandingFilter,string> = { ALL:"bg-[#0d0d0d] text-white", GOOD_STANDING:"bg-emerald-600 text-white", YELLOW_FLAG:"bg-amber-500 text-white", RED_FLAG:"bg-orange-600 text-white", SUSPENDED:"bg-rose-600 text-white" };
  const filterInactive:Record<StandingFilter,string> = { ALL:"text-[#0d0d0d]/50 hover:text-[#0d0d0d]", GOOD_STANDING:"text-emerald-700 hover:bg-emerald-50", YELLOW_FLAG:"text-amber-700 hover:bg-amber-50", RED_FLAG:"text-orange-700 hover:bg-orange-50", SUSPENDED:"text-rose-700 hover:bg-rose-50" };

  return (
    <>
      <style>{`.badge-chip{display:inline-flex;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase}`}</style>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-6" onClick={()=>setOpenMenu(null)}>

        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
            <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_users.title"))}</h1>
            <p className="text-sm text-[#0d0d0d]/45 mt-1">{isSuperAdmin?String(t("admin_users.subtitle_super")):String(t("admin_users.subtitle_admin"))}</p>
          </div>
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30"/>
            <input type="text" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={String(t("admin_users.search_placeholder"))}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white text-[#0d0d0d] placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"/>
          </div>
        </motion.div>

        {/* Tab + standing filter row */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {isSuperAdmin && (
            <div className="flex gap-1 p-1 bg-white rounded-xl border border-[#e8e4dc] w-fit shrink-0">
              {(["STUDENTS","ADMINS"] as const).map(tb=>(
                <button key={tb} onClick={()=>{setTab(tb);setPage(1);setStandingFilter("ALL");}}
                  className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all ${tab===tb?"bg-[#0d0d0d] text-white shadow-sm":"text-[#0d0d0d]/50 hover:text-[#0d0d0d]"}`}>
                  {tb==="STUDENTS"?String(t("admin_users.tabs.students")):String(t("admin_users.tabs.admins"))}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(["ALL","GOOD_STANDING","YELLOW_FLAG","RED_FLAG","SUSPENDED"] as StandingFilter[]).map(sf=>(
              <button key={sf} onClick={()=>{setStandingFilter(sf);setPage(1);}}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${standingFilter===sf?`${filterColors[sf]} border-transparent shadow-sm`:`bg-white border-[#e8e4dc] ${filterInactive[sf]}`}`}>
                {filterLabels[sf]}
                <span className={`text-[10px] tabular-nums px-1 rounded ${standingFilter===sf?"bg-white/20":"bg-[#f0eeea] text-[#0d0d0d]/50"}`}>{standingCounts[sf]}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Bulk delete bar */}
        {bulkSelected.size>0 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-[12px] font-bold text-red-700">{bulkSelected.size} user{bulkSelected.size>1?"s":""} selected</span>
            <div className="flex gap-2">
              <button onClick={()=>setBulkSelected(new Set())} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-100 transition-colors">Clear</button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">Delete {bulkSelected.size}</button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          <TanStackTable data={paginated} columns={cols} isLoading={isLoading} emptyText={String(t("admin_users.table.no_users"))} skeletonRows={6} rowClassName="cursor-pointer" onRowClick={u=>setSelected(u)}/>
        </motion.div>

        {/* Pagination */}
        {!isLoading && totalPages>1 && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              <ChevronLeft size={14}/> {String(t("common.pagination.previous"))}
            </button>
            <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors">
              {String(t("common.pagination.next"))} <ChevronRight size={14}/>
            </button>
          </motion.div>
        )}
      </motion.div>

      {selected && <InsightsPanel user={selected} insights={insights} onClose={()=>setSelected(null)}/>}
      <ConfirmDialog state={confirm} onClose={()=>setConfirm(null)} onConfirm={handleConfirm} loading={confirming}/>
    </>
  );
}
