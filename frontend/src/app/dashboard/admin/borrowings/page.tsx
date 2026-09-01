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

import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.07}}};
const ITEMS=10;

import { useReturnRentalWithInspection, useSystemConfig } from "@/lib/hooks/useQueries";
import { AlertTriangle, ClipboardCheck, X, CreditCard } from "lucide-react";

type Rental = {
  id: string;
  status: string;
  loan_date: string;
  due_date: string;
  return_date?: string | null;
  fine?: number | null;
  outgoing_condition?: string;
  user: { name: string; email: string; student_id?: string | null; trust_score?: number };
  physical_book: { title: string; rental_price?: number };
  copy?: { copy_code: string; condition: string };
};

// ── Mirrors backend DAMAGE_PENALTY_RATES exactly ─────────────────────────────
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

  // ── Live fine preview ─────────────────────────────────────────────────────
  const overdueFinePreview = calcOverdueFine(rental.due_date, dailyFine);
  const effectiveDamageType = isDamagedOrLost
    ? damageType || (returnedCondition === "LOST" ? "LOST" : "OTHER")
    : null;
  const damagePenaltyPreview = isDamagedOrLost && !waivePenalty
    ? calcDamagePenalty(effectiveDamageType!, rentalPrice)
    : 0;
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
      toast.success("Return inspection completed successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process return inspection.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          {/* Rental summary */}
          <div className="bg-[#f5f4f0] rounded-xl p-3.5 space-y-1 text-[12px] text-[#0d0d0d]/80">
            <p><strong>Borrower:</strong> {rental.user?.name} ({rental.user?.email})</p>
            <p><strong>Book:</strong> {rental.physical_book?.title}</p>
            <p>
              <strong>Copy:</strong>{" "}
              <span className="font-mono">{rental.copy?.copy_code || "—"}</span>
              {" "}· Issued as <span className="font-bold text-[#142b6f]">{outgoingCond}</span>
            </p>
          </div>

          {/* Condition selector */}
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

          {/* Damage section */}
          {isDamagedOrLost && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 text-[12px] font-bold">
                <AlertTriangle size={16} />
                <span>Damage Incident Detected</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-rose-900/60 uppercase tracking-wider">Damage Type</label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-rose-200 bg-white font-medium"
                >
                  <option value="TORN_COVER">Torn Cover</option>
                  <option value="HEAVY_ANNOTATION">Heavy Annotation / Scribbling</option>
                  <option value="BROKEN_BINDING">Broken Binding</option>
                  <option value="WATER_DAMAGE">Water / Fluid Damage</option>
                  <option value="MISSING_PAGES">Missing Pages</option>
                  <option value="LOST">Lost / Unrecoverable</option>
                  <option value="OTHER">Other Damage</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-rose-900/60 uppercase tracking-wider">Evidence Photo / URL (Optional)</label>
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

          {/* Inspector notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#0d0d0d]/50 uppercase tracking-wider">Inspector Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inspection observation or condition notes..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e8e4dc] bg-white resize-none"
            />
          </div>

          {/* ── Fine preview banner ──────────────────────────────────────── */}
          <div className={`rounded-xl border p-3.5 space-y-2 ${
            totalFinePreview > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="flex items-center gap-2">
              <CreditCard size={14} className={totalFinePreview > 0 ? "text-amber-700" : "text-emerald-700"} />
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                totalFinePreview > 0 ? "text-amber-800" : "text-emerald-800"
              }`}>
                Fine Preview
              </span>
            </div>

            <div className="space-y-1 text-[12px]">
              {overdueFinePreview > 0 && (
                <div className="flex justify-between text-amber-900/80">
                  <span>Overdue fine</span>
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
              <div className={`flex justify-between font-black text-[13px] pt-1 border-t ${
                totalFinePreview > 0
                  ? "border-amber-200 text-amber-900"
                  : "border-emerald-200 text-emerald-900"
              }`}>
                <span>Total charged to student</span>
                <span>{totalFinePreview.toFixed(2)} ETB</span>
              </div>
            </div>

            {totalFinePreview > 0 && (
              <p className="text-[10px] text-amber-700/70 leading-relaxed">
                The book will be marked <strong>Awaiting Payment</strong>. The student's account will be blocked from new borrows until this fine is settled at their next checkout.
              </p>
            )}
            {totalFinePreview === 0 && (
              <p className="text-[10px] text-emerald-700/70">
                No outstanding charges. Rental will close as <strong>Returned</strong>.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d]/70 hover:bg-[#f5f4f0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={returnInspection.isPending}
              className="px-5 py-2.5 rounded-xl bg-[#142b6f] text-white text-[12px] font-bold disabled:opacity-50 hover:bg-[#0e1f52]"
            >
              {returnInspection.isPending ? "Processing..." : "Complete Return Inspection"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Status display helpers ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  BORROWED:  "Borrowed",
  PENDING:   "Awaiting Payment",
  RETURNED:  "Returned",
  COMPLETED: "Completed",
};

const statusStyle = (status: string) => {
  switch (status) {
    case "BORROWED":   return "bg-blue-50 text-blue-700";
    case "PENDING":    return "bg-amber-50 text-amber-800";
    case "RETURNED":   return "bg-emerald-50 text-emerald-700";
    case "COMPLETED":  return "bg-[#f5f4f0] text-[#0d0d0d]/60";
    default:           return "bg-[#f5f4f0] text-[#0d0d0d]/50";
  }
};

function BorrowingsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [inspectingRental, setInspectingRental] = useState<Rental | null>(null);

  const statusFilter = searchParams.get("status") || "";
  const qp = new URLSearchParams();
  qp.set("limit", "200");
  if (statusFilter) qp.set("status", statusFilter);

  const { data, isLoading, refetch } = useRentals(qp.toString());
  const rentals: Rental[] = (data?.rentals || []) as unknown as Rental[];

  const filtered = rentals.filter(
    (r) =>
      !search.trim() ||
      matchesMultiLangQuery(r.user?.name, search) ||
      matchesMultiLangQuery(r.user?.email, search) ||
      matchesMultiLangQuery(r.user?.student_id, search) ||
      matchesMultiLangQuery(r.physical_book?.title, search) ||
      matchesMultiLangQuery(r.status, search),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const paginated = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  const cols: ColumnDef<Rental, unknown>[] = [
    {
      id: "student",
      header: String(t("admin_borrowings.table.student")),
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-bold text-[#0d0d0d] truncate">{row.original.user?.name}</p>
          <p className="text-[11px] text-[#0d0d0d]/40 truncate">{row.original.user?.email}</p>
        </div>
      ),
    },
    {
      id: "book",
      header: String(t("admin_borrowings.table.book")),
      cell: ({ row }) => <span className="text-[12px] text-[#0d0d0d] truncate block">{row.original.physical_book?.title}</span>,
    },
    {
      id: "loan",
      header: String(t("admin_borrowings.table.loan_date")),
      cell: ({ row }) => <span className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.loan_date).toLocaleDateString()}</span>,
    },
    {
      id: "due",
      header: String(t("admin_borrowings.table.due_date")),
      cell: ({ row }) => <span className="text-[12px] text-[#0d0d0d]/50">{new Date(row.original.due_date).toLocaleDateString()}</span>,
    },
    {
      id: "status",
      header: String(t("admin_borrowings.table.status")),
      cell: ({ row }) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusStyle(row.original.status)}`}>
          {STATUS_LABEL[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      id: "fine",
      header: String(t("admin_borrowings.table.fine")),
      cell: ({ row }) => (
        <span className={`text-[12px] ${Number(row.original.fine || 0) > 0 ? "font-bold text-red-600" : "text-[#0d0d0d]/50"}`}>
          {Number(row.original.fine || 0).toFixed(2)} ETB
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        // PENDING = book already physically returned, just fine unpaid — no re-inspection needed
        const done = r.status === "RETURNED" || r.status === "COMPLETED" || r.status === "PENDING";
        const label = r.status === "PENDING"
          ? "Awaiting Payment"
          : done
          ? "Returned"
          : "Inspect & Return";
        return (
          <button
            onClick={() => !done && setInspectingRental(r)}
            disabled={done}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              done
                ? "border-[#e8e4dc] text-[#0d0d0d]/25 cursor-not-allowed bg-transparent"
                : "border-[#142b6f] bg-[#142b6f] text-white hover:bg-[#0e1f52]"
            }`}
          >
            {label}
          </button>
        );
      },
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Library</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_borrowings.title"))}</h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_borrowings.subtitle"))}</p>
        </div>
        <div className="flex gap-3 w-full sm:flex-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={String(t("admin_borrowings.search_placeholder"))}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[#e8e4dc] bg-white placeholder:text-[#0d0d0d]/25 focus:outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e4dc] bg-white text-[12px] font-bold text-[#0d0d0d] hover:bg-[#f5f4f0] transition-colors shrink-0"
          >
            <RefreshCcw size={14} />
            {String(t("common.refresh") || "Refresh")}
          </button>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
        <TanStackTable
          data={paginated}
          columns={cols}
          isLoading={isLoading}
          emptyText={String(t("admin_borrowings.table.no_borrowings"))}
          skeletonRows={6}
        />
      </motion.div>
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

      {inspectingRental && (
        <ReturnInspectionModal
          rental={inspectingRental}
          onClose={() => setInspectingRental(null)}
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

