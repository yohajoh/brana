"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/hooks/useQueries";

const getFirstParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
};

export default function ChapaReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "pending" | "success" | "failed" | "error">("verifying");
  const [message, setMessage] = useState("Checking your payment confirmation...");
  const [attempts, setAttempts] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const isMountedRef = useRef(true);

  const txRef = useMemo(() => getFirstParam(searchParams, ["tx_ref", "trx_ref", "txRef", "reference"]), [searchParams]);

  const target = useMemo(() => {
    const txRef = getFirstParam(searchParams, ["tx_ref", "trx_ref", "txRef", "reference"]);
    const queryStatus = getFirstParam(searchParams, ["status"]);

    const targetParams = new URLSearchParams();
    if (txRef) targetParams.set("tx_ref", txRef);
    if (queryStatus) targetParams.set("status", queryStatus);

    const query = targetParams.toString();
    return `/dashboard/student/payments${query ? `?${query}` : ""}`;
  }, [searchParams]);

  const continueToPayments = useCallback(() => {
    if (redirecting) return;
    setRedirecting(true);
    router.replace(target);
  }, [redirecting, router, target]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!txRef) return;

    let timer: number | null = null;
    let stopped = false;

    const verify = async () => {
      if (stopped || !isMountedRef.current) return;

      setAttempts((prev) => prev + 1);

      try {
        const verifyRes = await api.get<{ data?: { payment?: { status?: string } }; payment?: { status?: string } }>(
          `/payments/verify/${encodeURIComponent(txRef)}`,
        );

        if (stopped || !isMountedRef.current) return;

        const paymentStatus = (verifyRes?.data?.payment?.status || verifyRes?.payment?.status || "").toUpperCase();

        if (paymentStatus === "SUCCESS") {
          setStatus("success");
          setMessage("Payment confirmed. Redirecting to your payments page...");
          window.setTimeout(() => {
            if (isMountedRef.current) continueToPayments();
          }, 1100);
          return;
        }

        if (paymentStatus === "FAILED") {
          setStatus("failed");
          setMessage("Payment failed confirmation. You can continue and retry from the payments page.");
          return;
        }

        setStatus("pending");
        setMessage("Your payment is still pending confirmation. We will keep checking automatically.");

        timer = window.setTimeout(verify, 3000);
      } catch {
        if (stopped || !isMountedRef.current) return;
        setStatus("pending");
        setMessage("Waiting for confirmation from payment provider... still checking.");
        timer = window.setTimeout(verify, 3000);
      }
    };

    verify();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [continueToPayments, txRef]);

  const displayStatus = txRef ? status : "error";
  const displayMessage = txRef
    ? message
    : "We could not find your payment reference. You can continue to your payments page.";

  const statusColor = useMemo(() => {
    if (displayStatus === "success") return "text-emerald-700 bg-emerald-100 border-emerald-200";
    if (displayStatus === "failed" || displayStatus === "error") return "text-rose-700 bg-rose-100 border-rose-200";
    return "text-amber-700 bg-amber-100 border-amber-200";
  }, [displayStatus]);

  const canContinue = !txRef || displayStatus === "success" || displayStatus === "failed" || attempts >= 3;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_60px_-30px_rgba(20,43,111,0.45)] backdrop-blur p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-center">
            <div className="relative h-16 w-16">
              {(displayStatus === "verifying" || displayStatus === "pending") && (
                <>
                  <span className="absolute inset-0 rounded-full border-4 border-[#142B6F]/20" />
                  <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#142B6F] animate-spin" />
                </>
              )}
              {displayStatus === "success" && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl">
                  ✓
                </span>
              )}
              {(displayStatus === "failed" || displayStatus === "error") && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 text-3xl">
                  !
                </span>
              )}
            </div>
          </div>

          <h1 className="text-center text-3xl sm:text-4xl font-serif font-extrabold text-[#142B6F]">
            Payment Confirmation
          </h1>
          <p className="mt-3 text-center text-sm sm:text-base text-[#203460]">{displayMessage}</p>

          <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${statusColor}`}>
            Status: {displayStatus.toUpperCase()} {txRef ? `• Ref: ${txRef}` : ""}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#203460] sm:grid-cols-3">
            <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e5e7eb]">
              <p className="text-xs uppercase tracking-wide text-[#5B6785]">Checks</p>
              <p className="mt-1 text-lg font-bold">{attempts}</p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e5e7eb]">
              <p className="text-xs uppercase tracking-wide text-[#5B6785]">Auto Check</p>
              <p className="mt-1 text-lg font-bold">Every 3s</p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e5e7eb]">
              <p className="text-xs uppercase tracking-wide text-[#5B6785]">Redirect</p>
              <p className="mt-1 text-lg font-bold">
                {displayStatus === "success" ? "Automatic" : canContinue ? "Manual ready" : "Waiting"}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              onClick={continueToPayments}
              disabled={!canContinue || redirecting}
              className="flex-1 rounded-xl bg-[#142B6F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2258] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {redirecting ? "Redirecting..." : "Continue to Payments"}
            </button>
            <button
              onClick={() => window.location.reload()}
              disabled={redirecting}
              className="rounded-xl border border-[#142B6F] px-5 py-3 text-sm font-bold text-[#142B6F] transition hover:bg-[#142B6F] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check Again
            </button>
          </div>

          <p className="mt-4 text-xs text-[#5B6785] text-center">
            If confirmation takes longer than expected, use Continue to open your payments page and retry safely.
          </p>
        </div>
      </div>
    </div>
  );
}
