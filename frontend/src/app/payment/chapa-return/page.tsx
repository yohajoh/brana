"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function ChapaReturnPage() {
  const searchParams = useSearchParams();
  const txRef =
    searchParams.get("tx_ref") ||
    searchParams.get("trx_ref") ||
    searchParams.get("reference") ||
    searchParams.get("txRef");

  const targetUrl = txRef
    ? `/dashboard/student/payments?tx_ref=${encodeURIComponent(txRef)}`
    : "/dashboard/student/payments";

  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    // Fire-and-forget verification — never await it, never block on it.
    if (txRef) {
      fetchApi(`/payments/verify/${encodeURIComponent(txRef)}`).catch(() => {});
    }

    // Redirect immediately via multiple methods
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.replace(targetUrl);
        return;
      }
    } catch {
      // cross-origin frame, fall through
    }

    window.location.replace(targetUrl);

    // If replace didn't work after 500ms, try assign
    setTimeout(() => {
      if (!document.hidden || window.location.pathname.includes("chapa-return")) {
        window.location.assign(targetUrl);
      }
    }, 500);

    // If that didn't work after 1.5s, try href
    setTimeout(() => {
      if (window.location.pathname.includes("chapa-return")) {
        window.location.href = targetUrl;
      }
    }, 1500);
  }, [targetUrl, txRef]);

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground flex items-center justify-center">
      <section className="mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-serif font-extrabold text-primary">Completing Payment</h1>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-secondary">Redirecting to your payments...</p>
        </div>

        {/* Manual fallback link — works even if JS is completely broken */}
        <a
          href={targetUrl}
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-background hover:bg-primary/90 transition-colors"
        >
          Continue Now
        </a>
        <p className="mt-3 text-xs text-secondary/70">If redirect does not happen automatically, click above.</p>
      </section>
    </main>
  );
}
