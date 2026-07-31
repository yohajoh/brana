"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMyPayments, useMyRentals, useMyDebtSummary, api } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef }   from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

/* ── types ───────────────────────────────────────────────────────── */
type Payment = {
  id: string; amount: number; method: "CHAPA" | "CASH";
  status: "PENDING" | "SUCCESS" | "FAILED"; paid_at: string;
  context?: "BORROW" | "FINE" | null;
  rental: { id: string; status: string; fine?: number | null; physical_book: { title: string } };
};
type RentalFine  = { id: string; fine: number | null; physical_book: { title: string } };
type DebtEntry   = { rental_id: string; book_title: string; amount: number | string | null };
type DebtSummary = { hasDebt?: boolean; totalDebt?: number | string | null; overdueFines?: DebtEntry[] };

/* ── animation variants ──────────────────────────────────────────── */
const fadeUp  = { hidden: { opacity:0, y:16 }, show: { opacity:1, y:0, transition:{ duration:0.38, ease:[0.16,1,0.3,1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/* ── status badge ────────────────────────────────────────────────── */
const statusBadge = (s: string) => {
  switch (s) {
    case "SUCCESS": return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "FAILED":  return "bg-red-50 text-red-600 border-red-100";
    default:        return "bg-amber-50 text-amber-700 border-amber-100";
  }
};

/* ── stat card ───────────────────────────────────────────────────── */
function PayStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <motion.div variants={fadeUp}
      className={`rounded-2xl border p-4 ${accent ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-[#e8e4dc]"}`}>
      <p className={`text-[22px] font-serif font-black leading-none ${accent ? "text-[#f5c518]" : "text-[#0d0d0d]"}`}>{value}</p>
      <p className={`text-[9px] font-black uppercase tracking-[0.15em] mt-2 ${accent ? "text-white/40" : "text-[#0d0d0d]/35"}`}>{label}</p>
    </motion.div>
  );
}

function PaymentsContent() {
  const { t } = useLanguage();
  const [txRef, setTxRef]               = useState<string | null>(null);
  const [verifying, setVerifying]       = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg]       = useState<string | null>(null);
  const hasVerified                     = useRef<string | null>(null);

  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const ref = p.get("tx_ref") || p.get("trx_ref") || p.get("reference") || p.get("txRef");
    setTxRef(ref);
  }, []);

  const { data: paymentsData, isLoading, refetch } = useMyPayments("limit=100");
  const { data: rentalsData }    = useMyRentals("status=PENDING&limit=100");
  const { data: debtData }       = useMyDebtSummary();

  const payments: Payment[]        = (paymentsData?.payments || []) as unknown as Payment[];
  const pendingFines: RentalFine[] = ((rentalsData?.rentals || []) as unknown as RentalFine[]).filter(r => Number(r.fine || 0) > 0);
  const debt = debtData?.data as DebtSummary | undefined;

  const verify = useCallback(async (ref: string) => {
    if (hasVerified.current === ref) return;
    try {
      setVerifying(ref); setVerifyMsg(null); hasVerified.current = ref;
      const res = await api.get<{ data: { payment: { status: string } } }>(`/payments/verify/${encodeURIComponent(ref)}`);
      await refetch();
      const st = res?.data?.payment?.status;
      setVerifyMsg(st === "SUCCESS" ? String(t("student_payments.success_verify"))
        : st === "PENDING"          ? String(t("student_payments.pending_verify"))
        : st === "FAILED"           ? String(t("student_payments.failed_verify"))
                                    : String(t("student_payments.status_updated")));
    } catch (e) { setVerifyMsg(e instanceof Error ? e.message : String(t("common.error_occurred"))); }
    finally { setVerifying(null); }
  }, [refetch, t]);

  useEffect(() => { if (txRef && !hasVerified.current) verify(txRef); }, [txRef, verify]);

  const payFine = async (rentalId: string) => {
    try {
      const res = await api.post<{ data: { chapaUrl?: string; message?: string } }>(
        `/payments/rental/${rentalId}/initiate`,
        { method: "CHAPA", context: "FINE" }
      );
      if (res?.data?.chapaUrl) window.location.href = res.data.chapaUrl;
      else if (res?.data?.message) setVerifyMsg(res.data.message);
    } catch (e) { setVerifyMsg(e instanceof Error ? e.message : String(t("common.error_occurred"))); }
  };

  const retry = async (p: Payment) => {
    try {
      // Use the payment's own context field — BORROW or FINE
      // Fall back to rental.status check if context is missing (older records)
      const context = p.context === "BORROW" || p.rental.status === "BORROWED" ? "BORROW" : "FINE";
      const res = await api.post<{ data: { chapaUrl?: string; message?: string } }>(
        `/payments/rental/${p.rental.id}/initiate`,
        { method: "CHAPA", context }
      );
      if (res?.data?.chapaUrl) window.location.href = res.data.chapaUrl;
      else if (res?.data?.message) setVerifyMsg(res.data.message);
    } catch (e) { setVerifyMsg(e instanceof Error ? e.message : String(t("common.error_occurred"))); }
  };

  const totalPaid   = payments.filter(p => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === "PENDING" || p.status === "FAILED").length;
  const actionable   = payments.filter(p => p.status === "PENDING" || p.status === "FAILED");

  const cols: ColumnDef<Payment, unknown>[] = [
    {
      id: "book",
      header: String(t("admin_reservations.table.book")),
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-[#0d0d0d] line-clamp-1">{row.original.rental?.physical_book?.title || "Book"}</p>
          <p className="text-[11px] text-[#0d0d0d]/40">{row.original.method}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-[13px] font-bold text-[#0d0d0d]">{Number(row.original.amount).toFixed(2)} ETB</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${statusBadge(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/40">
          {new Date(row.original.paid_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
        </span>
      ),
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-2 sm:p-4 lg:p-6 space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Finance</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("student_payments.title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_payments.subtitle"))}</p>

        <AnimatePresence>
          {verifying && (
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="mt-2 text-xs text-[#0d0d0d]/40">
              {String(t("student_payments.verifying", { ref: verifying }))}
            </motion.p>
          )}
          {verifyMsg && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="mt-3 px-4 py-3 rounded-xl bg-[#fdf9e7] border border-[#f5c518]/40 text-sm font-medium text-[#0d0d0d]">
              {verifyMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <PayStat label={String(t("student_payments.total_paid")   || "Total paid")}    value={`${totalPaid.toFixed(2)} ETB`} />
        <PayStat label={String(t("student_payments.pending_fines") || "Pending fines")} value={String(pendingFines.length)} accent={pendingFines.length > 0} />
        <PayStat label={String(t("student_payments.pending_payments") || "Pending tx")} value={String(totalPending)} accent={totalPending > 0} />
      </motion.div>

      {/* Debt alert */}
      <AnimatePresence>
        {debt?.hasDebt && (
          <motion.div variants={fadeUp}
            className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-1.5">
            <p className="text-sm font-bold text-red-800">{String(t("student_payments.outstanding_title"))}</p>
            <p className="text-[13px] text-red-700">
              {String(t("student_payments.outstanding_desc", { amount: Number(debt.totalDebt || 0).toFixed(2) }))}
            </p>
            {debt.overdueFines?.slice(0, 4).map(e => (
              <p key={e.rental_id} className="text-[12px] text-red-500">
                · {e.book_title}: {Number(e.amount || 0).toFixed(2)} ETB
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending fines */}
      <motion.div variants={fadeUp} className="space-y-3">
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
          {String(t("student_payments.pending_fines"))}
        </p>
        {isLoading ? (
          <div className="h-16 bg-white rounded-2xl border border-[#e8e4dc] animate-pulse" />
        ) : pendingFines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#e8e4dc] p-6 text-center">
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_payments.no_fines"))}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingFines.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#e8e4dc] px-4 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{r.physical_book?.title || (r as any).book?.title || "Book"}</p>
                  <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">

                    Fine: <span className="font-bold text-red-600">{Number(r.fine || 0).toFixed(2)} ETB</span>
                  </p>
                </div>
                <button onClick={() => payFine(r.id)}
                  className="px-4 py-2 rounded-full bg-[#0d0d0d] text-white text-[11px] font-bold hover:bg-[#292524] transition-colors shrink-0">
                  {String(t("student_payments.pay_now"))}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Pending/failed payments retry */}
      <AnimatePresence>
        {actionable.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
              {String(t("student_payments.pending_payments"))}
            </p>
            <div className="space-y-2">
              {actionable.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-amber-200 px-4 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{p.rental?.physical_book?.title || "Book"}</p>
                    <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">{Number(p.amount || 0).toFixed(2)} ETB · {p.status}</p>
                  </div>
                  <button onClick={() => retry(p)}
                    className="px-4 py-2 rounded-full bg-[#f5c518] text-[#0d0d0d] text-[11px] font-bold hover:bg-[#e8b000] transition-colors shrink-0">
                    {String(t("student_payments.continue_payment"))}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History table */}
      <motion.div variants={fadeUp} className="space-y-3 pb-10">
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
          {String(t("student_payments.history"))}
        </p>
        <div className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
          <TanStackTable
            data={payments}
            columns={cols}
            isLoading={isLoading}
            emptyText={String(t("student_payments.no_history"))}
            skeletonRows={4}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function StudentPaymentsPage() {
  return <PaymentsContent />;
}
