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
const fadeUp  = { hidden: { opacity:0, y:16 }, show: { opacity:1, y:0, transition:{ duration:0.38, ease:[0.16,1,0.3,1] as const } } };
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
      className="rounded-2xl border p-4 bg-white border-[#e8e4dc]">
      <p className={`text-[22px] font-serif font-black leading-none ${accent ? "text-[#b88c00]" : "text-[#0d0d0d]"}`}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-[0.15em] mt-2 text-[#0d0d0d]/35">{label}</p>
    </motion.div>
  );
}

import { Search, X, Copy, Check, KeyRound } from "lucide-react";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

import { useQueryClient } from "@tanstack/react-query";

function PaymentsContent() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [txRef, setTxRef]               = useState<string | null>(null);
  const [verifying, setVerifying]       = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg]       = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [activePickupModal, setActivePickupModal] = useState<any | null>(null);
  const [dismissedPickups, setDismissedPickups]   = useState<string[]>([]);
  const [copiedCode, setCopiedCode]               = useState(false);
  const hasVerified                     = useRef<string | null>(null);
  const autoOpenedRef                   = useRef<boolean>(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("dismissed_pickup_codes") || "[]");
      if (Array.isArray(stored)) setDismissedPickups(stored);
    } catch {}
  }, []);

  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const ref = p.get("tx_ref") || p.get("trx_ref") || p.get("reference") || p.get("txRef");
    setTxRef(ref);
  }, []);

  const { data: paymentsData, isLoading, refetch } = useMyPayments("limit=100");
  const { data: rentalsData }    = useMyRentals("limit=100");
  const { data: debtData }       = useMyDebtSummary();

  const payments: Payment[] = (paymentsData?.payments || []) as unknown as Payment[];
  const debt = debtData?.data as DebtSummary | undefined;

  // Include all pending fines / damage penalties across rentals
  const rentalsWithFine = ((rentalsData?.rentals || []) as unknown as RentalFine[]).filter(
    (r) => (r as any).status !== "COMPLETED" && Number(r.fine || 0) > 0
  );

  // Merge debt summary entries if any rental is not in rentalsWithFine
  const debtEntriesFromSummary: RentalFine[] = (debt?.overdueFines || [])
    .filter((entry) => !rentalsWithFine.some((r) => r.id === entry.rental_id))
    .map((entry) => ({
      id: entry.rental_id,
      fine: Number(entry.amount || 0),
      physical_book: { title: entry.book_title || "Book Damage Penalty" },
    }));

  const pendingFines: RentalFine[] = [...rentalsWithFine, ...debtEntriesFromSummary];

  const pendingPickups = ((rentalsData?.rentals || []) as unknown as any[]).filter(
    (r) => r.status === "PENDING" && r.pickup_code
  );

  const filteredPayments = payments.filter(p =>
    matchesMultiLangQuery(p.rental?.physical_book?.title || (p as any).rental?.book?.title, search) ||
    matchesMultiLangQuery(p.method, search) ||
    matchesMultiLangQuery(p.status, search)
  );

  const verify = useCallback(async (ref: string) => {
    if (hasVerified.current === ref) return;
    try {
      setVerifying(ref); setVerifyMsg(null); hasVerified.current = ref;
      const res = await api.get<{ data: { payment: { status: string } } }>(`/payments/verify/${encodeURIComponent(ref)}`);
      await refetch();

      // Invalidate all related financial & rental queries so banners and fine lists update immediately
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
      queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["my-debt-summary"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["student-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });

      const st = res?.data?.payment?.status;
      setVerifyMsg(st === "SUCCESS" ? String(t("student_payments.success_verify"))
        : st === "PENDING"          ? String(t("student_payments.pending_verify"))
        : st === "FAILED"           ? String(t("student_payments.failed_verify"))
                                    : String(t("student_payments.status_updated")));
    } catch (e) { setVerifyMsg(e instanceof Error ? e.message : String(t("common.error_occurred"))); }
    finally { setVerifying(null); }
  }, [refetch, t, queryClient]);

  useEffect(() => { if (txRef && !hasVerified.current) verify(txRef); }, [txRef, verify]);

  // ONLY auto popup when redirected from Chapa payment (txRef present in URL)
  useEffect(() => {
    if (txRef && pendingPickups.length > 0 && !autoOpenedRef.current) {
      const storedDismissed: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("dismissed_pickup_codes") || "[]");
        } catch {
          return [];
        }
      })();

      const latestUndismissed = pendingPickups.find(
        (p) => !storedDismissed.includes(p.id) && !storedDismissed.includes(p.pickup_code)
      );

      if (latestUndismissed) {
        setActivePickupModal(latestUndismissed);
        autoOpenedRef.current = true;
      }
    }
  }, [txRef, pendingPickups]);

  const handleClosePickupModal = () => {
    if (activePickupModal) {
      const id = activePickupModal.id;
      const code = activePickupModal.pickup_code;
      setDismissedPickups((prev) => {
        const next = [...prev, id, code];
        try {
          localStorage.setItem("dismissed_pickup_codes", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    setActivePickupModal(null);
    setCopiedCode(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

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
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
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
        </div>
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={String(t("common.search"))} className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#e8e4dc] bg-white text-[#0d0d0d] placeholder:text-[#0d0d0d]/30 focus:outline-none focus:border-[#0d0d0d]" />
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <PayStat label={String(t("student_payments.total_paid")   || "Total paid")}    value={`${totalPaid.toFixed(2)} ETB`} />
        <PayStat label={String(t("student_payments.pending_fines") || "Pending fines")} value={String(pendingFines.length)} accent={pendingFines.length > 0} />
        <PayStat label={String(t("student_payments.pending_payments") || "Pending tx")} value={String(totalPending)} accent={totalPending > 0} />
      </motion.div>

      {/* ONE-TIME VERIFICATION CODE POPUP MODAL WINDOW */}
      <AnimatePresence>
        {activePickupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#e8e4dc] shadow-2xl relative overflow-hidden text-center"
            >
              {/* Close X Button */}
              <button
                onClick={handleClosePickupModal}
                className="absolute top-4 right-4 p-2 rounded-full text-[#0d0d0d]/40 hover:text-[#0d0d0d] hover:bg-[#f5f3ef] transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <KeyRound size={28} />
              </div>

              <h3 className="text-xl font-serif font-black text-[#0d0d0d]">
                Verification Code
              </h3>

              <p className="text-xs text-[#0d0d0d]/60 mt-1 max-w-xs mx-auto">
                Present this verification code at the library desk to collect your copy:
              </p>
              <p className="text-sm font-bold text-indigo-950 mt-1.5 line-clamp-2 px-2 py-1 bg-indigo-50/50 rounded-lg">
                "{activePickupModal.physical_book?.title || "Book"}"
              </p>

              {/* Generated Code Display Box */}
              <div className="my-6 p-4 rounded-2xl bg-[#0d0d0d] text-white flex items-center justify-between gap-3 shadow-inner">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Verification Code
                  </p>
                  <p className="text-2xl font-mono font-black text-amber-400 tracking-wider">
                    {activePickupModal.pickup_code}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(activePickupModal.pickup_code)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#0d0d0d]/40 mb-6">
                💡 Click the <strong>X</strong> button to close. This verification code will not be displayed again.
              </p>

              <button
                onClick={handleClosePickupModal}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Got It, Close Window
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            data={filteredPayments}
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
