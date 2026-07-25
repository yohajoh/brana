"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMyPayments, useMyRentals, useMyDebtSummary, api } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

type Payment = {
  id: string;
  amount: number;
  method: "CHAPA" | "CASH";
  status: "PENDING" | "SUCCESS" | "FAILED";
  paid_at: string;
  rental: { id: string; status: string; fine?: number | null; physical_book: { title: string } };
};

type RentalFine = {
  id: string;
  fine: number | null;
  physical_book: { title: string };
};

type DebtFineEntry = { rental_id: string; book_title: string; amount: number | string | null };
type DebtSummary   = { hasDebt?: boolean; totalDebt?: number | string | null; overdueFines?: DebtFineEntry[] };

const statusStyle = (s: string) => {
  switch (s) {
    case "SUCCESS": return "bg-emerald-100 text-emerald-700";
    case "FAILED":  return "bg-red-100 text-red-700";
    default:        return "bg-amber-100 text-amber-700";
  }
};

function PaymentsContent() {
  const { t } = useLanguage();
  const [txRefFromQuery, setTxRefFromQuery] = useState<string | null>(null);
  const [verifyingTx, setVerifyingTx]       = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage]   = useState<string | null>(null);
  const hasVerifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const ref = p.get("tx_ref") || p.get("trx_ref") || p.get("reference") || p.get("txRef");
    setTxRefFromQuery(ref);
  }, []);

  const { data: paymentsData, isLoading, refetch: refetchPayments } = useMyPayments("limit=100");
  const { data: rentalsData }     = useMyRentals("status=PENDING&limit=100");
  const { data: debtSummaryData } = useMyDebtSummary();

  const payments: Payment[]     = (paymentsData?.payments || []) as unknown as Payment[];
  const pendingFines: RentalFine[] = ((rentalsData?.rentals || []) as unknown as RentalFine[]).filter(r => Number(r.fine || 0) > 0);
  const debtSummary = debtSummaryData?.data as DebtSummary | undefined;

  const verifyPayment = useCallback(async (txRef: string) => {
    if (hasVerifiedRef.current === txRef) return;
    try {
      setVerifyingTx(txRef);
      setVerifyMessage(null);
      hasVerifiedRef.current = txRef;
      const res = await api.get<{ data: { payment: { status: string } } }>(`/payments/verify/${encodeURIComponent(txRef)}`);
      await refetchPayments();
      const st = res?.data?.payment?.status;
      if      (st === "SUCCESS") setVerifyMessage(String(t("student_payments.success_verify")));
      else if (st === "PENDING") setVerifyMessage(String(t("student_payments.pending_verify")));
      else if (st === "FAILED")  setVerifyMessage(String(t("student_payments.failed_verify")));
      else                       setVerifyMessage(String(t("student_payments.status_updated")));
    } catch (e) {
      setVerifyMessage(e instanceof Error ? e.message : String(t("common.error_occurred")));
    } finally {
      setVerifyingTx(null);
    }
  }, [refetchPayments, t]);

  useEffect(() => {
    if (txRefFromQuery && !hasVerifiedRef.current) verifyPayment(txRefFromQuery);
  }, [txRefFromQuery, verifyPayment]);

  const payFine = async (rentalId: string) => {
    try {
      const res = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${rentalId}/initiate`, { method: "CHAPA" });
      if (res?.data?.chapaUrl) window.location.href = res.data.chapaUrl;
    } catch { setVerifyMessage(String(t("common.error_occurred"))); }
  };

  const retryPayment = async (p: Payment) => {
    try {
      const isBorrow = p.rental.status === "BORROWED" && Number(p.rental.fine || 0) <= 0;
      const res = await api.post<{ data: { chapaUrl: string } }>(`/payments/rental/${p.rental.id}/initiate`, { method: "CHAPA", context: isBorrow ? "BORROW" : "FINE" });
      if (res?.data?.chapaUrl) window.location.href = res.data.chapaUrl;
    } catch { setVerifyMessage(String(t("common.error_occurred"))); }
  };

  const actionable = payments.filter(p => p.status === "PENDING" || p.status === "FAILED");

  const historyColumns: ColumnDef<Payment, unknown>[] = [
    {
      id: "book",
      header: String(t("admin_reservations.table.book")),
      cell: ({ row }) => (
        <span className="text-[13px] font-semibold text-[#0d0d0d] line-clamp-1">
          {row.original.rental?.physical_book?.title || "Book"}
        </span>
      ),
    },
    {
      id: "amount",
      header: String(t("dashboard.stats.revenue")),
      cell: ({ row }) => (
        <span className="text-[13px] font-bold text-[#0d0d0d]">
          {Number(row.original.amount).toFixed(2)} ETB
        </span>
      ),
    },
    {
      id: "method",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/50">{row.original.method}</span>
      ),
    },
    {
      id: "status",
      header: String(t("admin_reservations.table.status")),
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusStyle(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-[12px] text-[#0d0d0d]/40">
          {new Date(row.original.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-7 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Finance</p>
        <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">{String(t("student_payments.title"))}</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_payments.subtitle"))}</p>
        {verifyingTx && (
          <p className="text-xs text-[#0d0d0d]/50 mt-2">{String(t("student_payments.verifying", { ref: verifyingTx }))}</p>
        )}
        {verifyMessage && (
          <div className="mt-3 px-4 py-3 rounded-xl bg-[#fdf9e7] border border-[#f5c518]/30 text-sm font-medium text-[#0d0d0d]">
            {verifyMessage}
          </div>
        )}
      </div>

      {/* Debt alert */}
      {debtSummary?.hasDebt && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-2">
          <p className="text-sm font-bold text-red-800">{String(t("student_payments.outstanding_title"))}</p>
          <p className="text-[13px] text-red-700">
            {String(t("student_payments.outstanding_desc", { amount: Number(debtSummary.totalDebt || 0).toFixed(2) }))}
          </p>
          {debtSummary.overdueFines?.slice(0, 4).map(e => (
            <p key={e.rental_id} className="text-[12px] text-red-600">
              · {e.book_title}: {Number(e.amount || 0).toFixed(2)} ETB
            </p>
          ))}
        </div>
      )}

      {/* Pending fines */}
      <div className="space-y-3">
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
          {String(t("student_payments.pending_fines"))}
        </p>
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#e8e6e1] p-4 animate-pulse h-16" />
        ) : pendingFines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#e8e6e1] p-6 text-center">
            <p className="text-sm text-[#0d0d0d]/35">{String(t("student_payments.no_fines"))}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingFines.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#e8e6e1] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">{r.physical_book.title}</p>
                  <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">
                    Fine: <span className="font-bold text-red-600">{Number(r.fine || 0).toFixed(2)} ETB</span>
                  </p>
                </div>
                <button
                  onClick={() => payFine(r.id)}
                  className="px-4 py-2 rounded-full bg-[#0d0d0d] text-white text-[11px] font-bold hover:bg-[#292524] transition-colors shrink-0"
                >
                  {String(t("student_payments.pay_now"))}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending/failed payments */}
      {actionable.length > 0 && (
        <div className="space-y-3">
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
            {String(t("student_payments.pending_payments"))}
          </p>
          <div className="space-y-2">
            {actionable.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">
                    {p.rental?.physical_book?.title || "Book"}
                  </p>
                  <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">
                    {Number(p.amount || 0).toFixed(2)} ETB · {p.status}
                  </p>
                </div>
                <button
                  onClick={() => retryPayment(p)}
                  className="px-4 py-2 rounded-full bg-[#f5c518] text-[#0d0d0d] text-[11px] font-bold hover:bg-[#e8b000] transition-colors shrink-0"
                >
                  {String(t("student_payments.continue_payment"))}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3 pb-10">
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.18em]">
          {String(t("student_payments.history"))}
        </p>
        <div className="bg-white rounded-2xl border border-[#e8e6e1] overflow-hidden">
          <TanStackTable
            data={payments}
            columns={historyColumns}
            isLoading={isLoading}
            emptyText={String(t("student_payments.no_history"))}
            skeletonRows={4}
          />
        </div>
      </div>
    </div>
  );
}

export default function StudentPaymentsPage() {
  return <PaymentsContent />;
}
