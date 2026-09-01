"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ClipboardCheck,
  X,
  CreditCard,
  Bell,
  CheckCircle2,
  Clock,
  BookOpen,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRentals,
  useReturnRentalWithInspection,
  useSettleRentalFine,
  useVerifyPickupCode,
  useCancelPendingPickup,
  useSendOverdueReminders,
  useSystemConfig,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const ITEMS   = 10;

type FilterTab = "ALL" | "BORROWED" | "OVERDUE" | "PENDING" | "CLOSED";

type Rental = {
  id: string;
  status: string;
  loan_date: string;
  due_date: string;
  return_date?: string | null;
  fine?: number | null;
  pickup_code?: string | null;
  outgoing_condition?: string;
  returned_condition?: string | null;
  user: { name: string; email: string; student_id?: string | null; trust_score?: number; standing?: string };
  physical_book: { title: string; rental_price?: number };
  copy?: { copy_code: string; condition: string };
};

/* ── Rate matrix matching backend exactly ────────────────────────────────── */
const DAMAGE_BASE_RATES: Record<string, number> = {
  TORN_COVER: 50,
  HEAVY_ANNOTATION: 50,
  BROKEN_BINDING: 100,
  WATER_DAMAGE: 150,
  MISSING_PAGES: 150,
  LOST: 300,
  OTHER: 75,
};

function calcDamagePenalty(damageType: string, rentalPrice: number): number {
  const base = DAMAGE_BASE_RATES[damageType] ?? 50;
  return parseFloat((base + rentalPrice * 2).toFixed(2));
}

function calcOverdueFine(dueDate: string, dailyFine: number): number {
  const due = new Date(dueDate);
  const now = new Date();
  if (now <= due) return 0;
  const days = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return parseFloat((days * dailyFine).toFixed(2));
}

function getOverdueDays(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  if (now <= due) return 0;
  return Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── Condition Chip ──────────────────────────────────────────────────────── */
function ConditionPill({ cond }: { cond?: string | null }) {
  if (!cond) return <span className="text-[#0d0d0d]/30 text-[10px]">—</span>;
  const map: Record<string, string> = {
    NEW: "bg-sky-50 text-sky-700 border-sky-200",
    GOOD: "bg-emerald-50 text-emerald-700 border-emerald-200",
    WORN: "bg-amber-50 text-amber-700 border-amber-200",
    DAMAGED: "bg-rose-50 text-rose-700 border-rose-200",
    LOST: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${map[cond] ?? "bg-gray-100 text-gray-600"}`}>
      {cond}
    </span>
  );
}

/* ── Status display helpers ────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  BORROWED: "Active Loan",
  OVERDUE: "Overdue",
  PENDING: "Awaiting Payment",
  RETURNED: "Returned",
  COMPLETED: "Closed / Paid",
  PROCESSING: "Processing…",
};

const statusStyle = (status: string, isOverdue: boolean) => {
  if (status === "BORROWED" && isOverdue) return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse";
  switch (status) {
    case "BORROWED": return "bg-blue-50 text-blue-700 border-blue-200";
    case "PENDING": return "bg-amber-50 text-amber-800 border-amber-200";
    case "RETURNED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "COMPLETED": return "bg-[#f5f4f0] text-[#0d0d0d]/60 border-[#e8e4dc]";
    case "PROCESSING": return "bg-slate-50 text-slate-500 border-slate-200 animate-pulse";
    default: return "bg-[#f5f4f0] text-[#0d0d0d]/50 border-[#e8e4dc]";
  }
};

/* ── Return Inspection Modal ─────────────────────────────────────────────── */
function ReturnInspectionModal({
  rental,
  onClose,
  onSuccess,
}: {
  rental: Rental;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const returnInspection = useReturnRentalWithInspection();
  const { data: configData } = useSystemConfig();
  const dailyFine: number = Number((configData as any)?.data?.config?.daily_fine ?? 0);
  const rentalPrice: number = Number(rental.physical_book?.rental_price ?? 10);

  const [returnedCondition, setReturnedCondition] = useState<string>(
    rental.outgoing_condition || rental.copy?.condition || "GOOD"
  );
  const [damageType, setDamageType] = useState<string>("TORN_COVER");
  const [notes, setNotes] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [waivePenalty, setWaivePenalty] = useState<boolean>(false);

  const conditionOrder: Record<string, number> = { NEW: 4, GOOD: 3, WORN: 2, DAMAGED: 1, LOST: 0 };
  const outgoingCond = rental.outgoing_condition || rental.copy?.condition || "GOOD";
  const isConditionDegraded = conditionOrder[returnedCondition] < conditionOrder[outgoingCond];
  const isDamagedOrLost = returnedCondition === "DAMAGED" || returnedCondition === "LOST" || isConditionDegraded;

  const overdueFinePreview = calcOverdueFine(rental.due_date, dailyFine);
  const effectiveDamageType = isDamagedOrLost ? damageType || (returnedCondition === "LOST" ? "LOST" : "OTHER") : null;
  const damagePenaltyPreview = isDamagedOrLost && !waivePenalty ? calcDamagePenalty(effectiveDamageType!, rentalPrice) : 0;
  const totalFinePreview = parseFloat((overdueFinePreview + damagePenaltyPreview).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await returnInspection.mutateAsync({
        rentalId: rental.id,
        returnedCondition,
        damageType: isDamagedOrLost ? damageType : undefined,
        notes: notes.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        waivePenalty: isDamagedOrLost ? waivePenalty : false,
      });
      toast.success("Return inspection completed!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process return inspection.");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e4dc] bg-[#faf9f6]">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5 h-5 text-[#142b6f]" />
              <div>
                <h2 className="text-[15px] font-serif font-black text-[#0d0d0d]">Return Handshake & Inspection</h2>
                <p className="text-[11px] text-[#0d0d0d]/50">Verify physical condition before closing loan</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d]">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-[#f5f4f0] rounded-xl p-3.5 space-y-1 text-[12px] text-[#0d0d0d]/80">
              <p><strong>Borrower:</strong> {rental.user?.name} ({rental.user?.email})</p>
              <p><strong>Book:</strong> {rental.physical_book?.title}</p>
              <p>
                <strong>Copy Code:</strong> <span className="font-mono font-bold text-[#142b6f]">{rental.copy?.copy_code || "N/A"}</span>
                {" "}· Issued as <ConditionPill cond={outgoingCond} />
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">
                Returned Physical Condition
              </label>
              <div className="grid grid-cols-5 gap-2">
                {["NEW", "GOOD", "WORN", "DAMAGED", "LOST"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setReturnedCondition(c)}
                    className={`py-2 text-[11px] font-extrabold rounded-xl border transition-all ${
                      returnedCondition === c
                        ? c === "DAMAGED" || c === "LOST"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-[#142b6f] text-white border-[#142b6f] shadow-sm"
                        : "bg-white text-[#0d0d0d]/70 border-[#e8e4dc] hover:border-[#0d0d0d]/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {isDamagedOrLost && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-rose-800 text-[12px] font-bold">
                  <AlertTriangle size={16} />
                  <span>Damage Incident Detected</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-900/60 uppercase tracking-wider">Damage Category</label>
                  <select
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-rose-200 bg-white font-medium"
                  >
                    <option value="TORN_COVER">Torn Cover (50 ETB base + 2x price)</option>
                    <option value="HEAVY_ANNOTATION">Heavy Annotation / Scribbling (50 ETB base + 2x price)</option>
                    <option value="BROKEN_BINDING">Broken Binding (100 ETB base + 2x price)</option>
                    <option value="WATER_DAMAGE">Water / Fluid Damage (150 ETB base + 2x price)</option>
                    <option value="MISSING_PAGES">Missing Pages (150 ETB base + 2x price)</option>
                    <option value="LOST">Lost / Unrecoverable (300 ETB base + 2x price)</option>
                    <option value="OTHER">Other Damage (75 ETB base + 2x price)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-900/60 uppercase tracking-wider">Evidence Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-rose-200 bg-white placeholder:text-rose-900/30"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waivePenalty}
                    onChange={(e) => setWaivePenalty(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded"
                  />
                  <span className="text-[11px] font-semibold text-rose-900">Waive damage penalty fee for borrower</span>
                </label>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Inspector Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inspection observations..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e8e4dc] bg-white resize-none"
              />
            </div>

            <div className={`rounded-xl border p-3.5 space-y-2 ${totalFinePreview > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className={totalFinePreview > 0 ? "text-amber-700" : "text-emerald-700"} />
                <span className={`text-[11px] font-black uppercase tracking-wider ${totalFinePreview > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                  Fine & Debt Summary
                </span>
              </div>
              <div className="space-y-1 text-[12px]">
                {overdueFinePreview > 0 && (
                  <div className="flex justify-between text-amber-900/80">
                    <span>Overdue fine ({getOverdueDays(rental.due_date)} days)</span>
                    <span className="font-bold">{overdueFinePreview.toFixed(2)} ETB</span>
                  </div>
                )}
                {isDamagedOrLost && (
                  <div className="flex justify-between text-rose-800/80">
                    <span>Damage penalty{waivePenalty ? " (waived)" : ""}</span>
                    <span className={`font-bold ${waivePenalty ? "line-through opacity-50" : ""}`}>
                      {calcDamagePenalty(effectiveDamageType!, rentalPrice).toFixed(2)} ETB
                    </span>
                  </div>
                )}
                <div className={`flex justify-between font-black text-[13px] pt-1 border-t ${totalFinePreview > 0 ? "border-amber-200 text-amber-900" : "border-emerald-200 text-emerald-900"}`}>
                  <span>Total charged to student</span>
                  <span>{totalFinePreview.toFixed(2)} ETB</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d]/70 hover:bg-[#f5f4f0]"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={returnInspection.isPending}
                className="px-5 py-2.5 rounded-xl bg-[#142b6f] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#0e1f52]"
              >
                {returnInspection.isPending ? "Processing..." : "Complete Return Inspection"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Desk Fine Settlement Modal ──────────────────────────────────────────── */
function SettleFineModal({
  rental,
  onClose,
  onSuccess,
}: {
  rental: Rental;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const settleFine = useSettleRentalFine();
  const [method, setMethod] = useState<"CASH" | "WAIVE">("CASH");
  const [notes, setNotes] = useState<string>("");
  const fineAmount = Number(rental.fine || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "WAIVE" && !notes.trim()) {
      toast.error("Waiver justification note is required for audit logs.");
      return;
    }
    try {
      await settleFine.mutateAsync({
        rentalId: rental.id,
        method,
        notes: notes.trim() || undefined,
      });
      toast.success(method === "CASH" ? "Cash payment recorded & loan closed!" : "Fine waived & loan closed!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to settle fine.");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-md shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#e8e4dc] pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">Settle Pending Fine</h3>
                <p className="text-[11px] text-[#0d0d0d]/50">Process student payment at library desk</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d]">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 bg-[#f5f4f0] rounded-xl space-y-1 text-xs">
              <p><strong>Student:</strong> {rental.user?.name} ({rental.user?.email})</p>
              <p><strong>Book:</strong> {rental.physical_book?.title}</p>
              <p className="text-rose-700 font-bold pt-1 text-sm">
                Outstanding Fine: {fineAmount.toFixed(2)} ETB
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Settlement Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("CASH")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    method === "CASH" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-[#0d0d0d]/70 border-[#e8e4dc]"
                  }`}
                >
                  💵 Cash Paid at Desk
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("WAIVE")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    method === "WAIVE" ? "bg-amber-600 text-white border-amber-600 shadow-sm" : "bg-white text-[#0d0d0d]/70 border-[#e8e4dc]"
                  }`}
                >
                  ⚖️ Waive Fine Fee
                </button>
              </div>
            </div>

            {method === "WAIVE" && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-amber-900/70 uppercase tracking-wider">
                  Audit Waiver Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="State reason for administrative waiver..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 bg-amber-50/50 resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-xs font-bold text-[#0d0d0d]/70">
                Cancel
              </button>
              <button
                type="submit" disabled={settleFine.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 hover:bg-emerald-800"
              >
                {settleFine.isPending ? "Processing..." : method === "CASH" ? "Confirm Cash Received" : "Confirm Fee Waiver"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Desk Pickup Verification Modal ─────────────────────────────────────── */
function VerifyPickupModal({
  rental,
  onClose,
  onSuccess,
}: {
  rental: Rental;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const verifyPickup = useVerifyPickupCode();
  const cancelPickup = useCancelPendingPickup();
  const [pickupCode, setPickupCode] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"VERIFY" | "CANCEL">("VERIFY");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPickup.mutateAsync({ rentalId: rental.id, pickupCode });
      toast.success(`Verification successful! Physical book handed over.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code. Please check code with student.");
      onClose();
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cancelPickup.mutateAsync({ rentalId: rental.id, reason });
      toast.success(`Pending borrow cancelled. Copy returned to active inventory.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel borrow request.");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl border border-[#e8e4dc] p-6 w-full max-w-md shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#e8e4dc] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-[16px] font-serif font-black text-[#0d0d0d]">Verify Code</h3>
                <p className="text-[11px] text-[#0d0d0d]/50">Validate borrower verification code before handing over copy</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f5f4f0] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d]">
              <X size={15} />
            </button>
          </div>

          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-indigo-950">
            <p><strong>Student Borrower:</strong> {rental.user?.name} ({rental.user?.email})</p>
            <p><strong>Book Title:</strong> {rental.physical_book?.title}</p>
            <p><strong>Allocated Copy Code:</strong> <span className="font-mono font-bold text-indigo-800">{rental.copy?.copy_code || "N/A"}</span></p>
          </div>

          <div className="flex rounded-xl bg-[#f5f4f0] p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("VERIFY")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === "VERIFY" ? "bg-white text-indigo-700 shadow-sm" : "text-[#0d0d0d]/60"}`}
            >
              🔑 Verify Code
            </button>
            <button
              type="button"
              onClick={() => setMode("CANCEL")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === "CANCEL" ? "bg-white text-rose-700 shadow-sm" : "text-[#0d0d0d]/60"}`}
            >
              ⚠️ Cancel Borrow
            </button>
          </div>

          {mode === "VERIFY" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#0d0d0d]/60 uppercase tracking-wider">
                  Enter Verification Code Provided By Student
                </label>
                <input
                  type="text"
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PK-7B9X"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 font-mono text-sm font-bold text-[#0d0d0d] bg-[#faf9f6] border border-[#e8e4dc] rounded-xl focus:border-indigo-600 focus:outline-none tracking-widest uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-xs font-bold text-[#0d0d0d]/70">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyPickup.isPending || !pickupCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {verifyPickup.isPending ? "Verifying..." : "Verify Code"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCancel} className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold">Release Copy to Inventory?</p>
                <p className="text-[11px]">This will cancel the pending borrow request and make copy <strong className="font-mono">{rental.copy?.copy_code}</strong> available for other students to rent.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Incorrect borrower code / student failed to show up..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-[#faf9f6] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] text-xs font-bold text-[#0d0d0d]/70">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelPickup.isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-rose-700 shadow-sm"
                >
                  {cancelPickup.isPending ? "Releasing..." : "Confirm Cancel & Release Copy"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main Borrowings Content ─────────────────────────────────────────────── */
function BorrowingsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);

  const [inspectingRental, setInspectingRental] = useState<Rental | null>(null);
  const [settlingRental, setSettlingRental] = useState<Rental | null>(null);
  const [verifyingPickupRental, setVerifyingPickupRental] = useState<Rental | null>(null);

  const sendReminders = useSendOverdueReminders();

  const qp = new URLSearchParams();
  qp.set("limit", "250");
  const { data, isLoading, refetch } = useRentals(qp.toString());
  const rawRentals = (data as any)?.rentals || (data as any)?.data?.rentals || (data as any)?.data || (Array.isArray(data) ? data : []);
  const rentals: Rental[] = Array.isArray(rawRentals) ? (rawRentals as unknown as Rental[]) : [];

  /* Status Filter Logic */
  const filtered = rentals.filter((r) => {
    const statusUpper = (r.status || "").toUpperCase();
    const isOverdue = statusUpper === "BORROWED" && new Date(r.due_date) < new Date();
    if (tab === "BORROWED" && (statusUpper !== "BORROWED" || isOverdue)) return false;
    if (tab === "OVERDUE" && !isOverdue) return false;
    if (tab === "PENDING" && statusUpper !== "PENDING") return false;
    if (tab === "CLOSED" && statusUpper !== "RETURNED" && statusUpper !== "COMPLETED") return false;

    if (!search.trim()) return true;
    return (
      matchesMultiLangQuery(r.user?.name, search) ||
      matchesMultiLangQuery(r.user?.email, search) ||
      matchesMultiLangQuery(r.user?.student_id, search) ||
      matchesMultiLangQuery(r.physical_book?.title, search) ||
      matchesMultiLangQuery(r.copy?.copy_code, search) ||
      matchesMultiLangQuery(r.pickup_code, search) ||
      matchesMultiLangQuery(r.status, search)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const paginated = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  /* Metric KPI Summaries */
  const activeCount = rentals.filter((r) => (r.status || "").toUpperCase() === "BORROWED" && new Date(r.due_date) >= new Date()).length;
  const overdueCount = rentals.filter((r) => (r.status || "").toUpperCase() === "BORROWED" && new Date(r.due_date) < new Date()).length;
  const pendingDebtCount = rentals.filter((r) => (r.status || "").toUpperCase() === "PENDING").length;
  const pendingDebtETB = rentals
    .filter((r) => (r.status || "").toUpperCase() === "PENDING")
    .reduce((sum, r) => sum + Number(r.fine || 0), 0);

  const handleSendReminders = async () => {
    try {
      const res = await sendReminders.mutateAsync(undefined);
      toast.success(`Dispatched ${res.data?.remindersSent || 0} overdue reminder notification(s)!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reminders.");
    }
  };

  const cols: ColumnDef<Rental, unknown>[] = [
    {
      id: "student",
      header: String(t("admin_borrowings.table.student")),
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.user?.name}</p>
          <p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.user?.email}</p>
          {row.original.user?.student_id && (
            <span className="text-[10px] font-mono text-[#0d0d0d]/35">ID: {row.original.user.student_id}</span>
          )}
        </div>
      ),
    },
    {
      id: "book",
      header: String(t("admin_borrowings.table.book")),
      cell: ({ row }) => (
        <div className="min-w-[160px]">
          <span className="text-[12px] font-semibold text-[#0d0d0d] truncate block">{row.original.physical_book?.title}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.original.copy?.copy_code && (
              <span className="text-[10px] font-mono font-bold bg-[#f5f4f0] px-1.5 py-0.5 rounded text-[#0d0d0d]/60">
                {row.original.copy.copy_code}
              </span>
            )}
            <ConditionPill cond={row.original.copy?.condition || row.original.returned_condition || row.original.outgoing_condition} />
          </div>
        </div>
      ),
    },
    {
      id: "due",
      header: "Loan & Due Date",
      cell: ({ row }) => {
        const r = row.original;
        const isOverdue = r.status === "BORROWED" && new Date(r.due_date) < new Date();
        const daysOver = getOverdueDays(r.due_date);
        return (
          <div className="text-[11px]">
            <p className="text-[#0d0d0d]/60">Issued: {new Date(r.loan_date).toLocaleDateString()}</p>
            <p className={`font-bold mt-0.5 ${isOverdue ? "text-rose-600" : "text-[#0d0d0d]/80"}`}>
              Due: {new Date(r.due_date).toLocaleDateString()}
            </p>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-extrabold uppercase mt-0.5">
                <Clock size={10} /> {daysOver}d Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: String(t("admin_borrowings.table.status")),
      cell: ({ row }) => {
        const r = row.original;
        const statusUpper = (r.status || "").toUpperCase();
        const isOverdue = statusUpper === "BORROWED" && new Date(r.due_date) < new Date();

        if (statusUpper === "PENDING") {
          return (
            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] uppercase border bg-amber-50 text-amber-800 border-amber-200 font-bold">
              PENDING
            </span>
          );
        }

        return (
          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] uppercase border ${statusStyle(statusUpper, isOverdue)}`}>
            {isOverdue ? "OVERDUE" : STATUS_LABEL[statusUpper] ?? statusUpper}
          </span>
        );
      },
    },
    {
      id: "fine",
      header: String(t("admin_borrowings.table.fine")),
      cell: ({ row }) => {
        const fine = Number(row.original.fine || 0);
        return (
          <span className={`text-[12px] ${fine > 0 ? "font-bold text-rose-600" : "text-[#0d0d0d]/40"}`}>
            {fine > 0 ? `${fine.toFixed(2)} ETB` : "0.00 ETB"}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        const statusUpper = (r.status || "").toUpperCase();
        const isOverdue = statusUpper === "BORROWED" && new Date(r.due_date) < new Date();

        if (statusUpper === "PENDING") {
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setVerifyingPickupRental(r)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1"
              >
                🔑 Verify Code
              </button>
              {Number(r.fine || 0) > 0 && (
                <button
                  onClick={() => setSettlingRental(r)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  💵 Settle Fine
                </button>
              )}
            </div>
          );
        }

        if (statusUpper === "BORROWED") {
          return (
            <button
              onClick={() => setInspectingRental(r)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                isOverdue
                  ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                  : "border-[#142b6f] bg-[#142b6f] text-white hover:bg-[#0e1f52]"
              }`}
            >
              Inspect & Return
            </button>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0d0d0d]/35">
            <CheckCircle2 size={12} className="text-emerald-500" /> Closed
          </span>
        );
      },
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library Desk</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_borrowings.title"))}</h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_borrowings.subtitle"))}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendReminders}
            disabled={sendReminders.isPending || overdueCount === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[12px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition-colors shrink-0"
          >
            <Bell size={14} className="text-amber-600" />
            Remind Overdue ({overdueCount})
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors shrink-0"
          >
            <RefreshCcw size={14} />
            {String(t("common.refresh") || "Refresh")}
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-[#e8e4dc] rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[#0d0d0d]/40">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Loans</span>
            <BookOpen size={15} />
          </div>
          <p className="text-2xl font-serif font-black text-[#0d0d0d]">{activeCount}</p>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-black uppercase tracking-wider">Overdue Items</span>
            <AlertTriangle size={15} />
          </div>
          <p className="text-2xl font-serif font-black text-rose-700">{overdueCount}</p>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Awaiting Payment</span>
            <CreditCard size={15} />
          </div>
          <p className="text-2xl font-serif font-black text-amber-800">{pendingDebtCount}</p>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Fine Debt</span>
            <DollarSign size={15} />
          </div>
          <p className="text-2xl font-serif font-black text-emerald-800">{pendingDebtETB.toFixed(2)} ETB</p>
        </div>
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 p-1 bg-white rounded-xl border border-[#e8e4dc]">
          {[
            { id: "ALL", label: "All Loans", count: rentals.length },
            { id: "BORROWED", label: "Active", count: activeCount },
            { id: "OVERDUE", label: "Overdue", count: overdueCount },
            { id: "PENDING", label: "Awaiting Fine", count: pendingDebtCount },
            { id: "CLOSED", label: "Closed", count: rentals.filter((r) => r.status === "RETURNED" || r.status === "COMPLETED").length },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id as FilterTab); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11.5px] font-bold transition-all ${
                tab === tb.id ? "bg-[#0d0d0d] text-white shadow-sm" : "text-[#0d0d0d]/50 hover:text-[#0d0d0d]"
              }`}
            >
              {tb.label}
              <span className={`text-[10px] px-1 rounded ${tab === tb.id ? "bg-white/20" : "bg-[#f0eeea] text-[#0d0d0d]/50"}`}>
                {tb.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={String(t("admin_borrowings.search_placeholder"))}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] transition-all"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
        <TanStackTable
          data={paginated}
          columns={cols}
          isLoading={isLoading}
          emptyText={String(t("admin_borrowings.table.no_borrowings"))}
          skeletonRows={6}
        />
      </motion.div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
            {String(t("common.pagination.previous"))}
          </button>
          <span className="text-[12px] text-[#0d0d0d]/40 tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] disabled:opacity-30 transition-colors"
          >
            {String(t("common.pagination.next"))}
            <ChevronRight size={14} />
          </button>
        </motion.div>
      )}

      {/* Inspection Modal */}
      {inspectingRental && (
        <ReturnInspectionModal
          rental={inspectingRental}
          onClose={() => setInspectingRental(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Desk Fine Settlement Modal */}
      {settlingRental && (
        <SettleFineModal
          rental={settlingRental}
          onClose={() => setSettlingRental(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Desk Pickup Verification Modal */}
      {verifyingPickupRental && (
        <VerifyPickupModal
          rental={verifyingPickupRental}
          onClose={() => setVerifyingPickupRental(null)}
          onSuccess={() => refetch()}
        />
      )}
    </motion.div>
  );
}

export default function AdminBorrowingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white rounded-xl border border-[#e8e4dc] animate-pulse" />
          ))}
        </div>
      }
    >
      <BorrowingsContent />
    </Suspense>
  );
}
