"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function ChapaReturnPage() {
  const searchParams = useSearchParams();
  const txRef = useMemo(
    () =>
      searchParams.get("tx_ref") ||
      searchParams.get("trx_ref") ||
      searchParams.get("reference") ||
      searchParams.get("txRef"),
    [searchParams],
  );

  const [message, setMessage] = useState("Finalizing your payment...");
  const [targetUrl, setTargetUrl] = useState("/dashboard/student/payments");

  useEffect(() => {
    const navigateNow = (url: string) => {
      const absoluteUrl = new URL(url, window.location.origin).toString();
      setTargetUrl(absoluteUrl);

      const forceCurrentTabNavigation = () => {
        if (window.location.href === absoluteUrl) return;
        window.location.replace(absoluteUrl);
      };

      // Chapa may render return_url inside a frame. Try escaping to top-level window first.
      try {
        if (window.top && window.top !== window) {
          window.top.location.replace(absoluteUrl);
        }
      } catch {
        // Ignore cross-origin frame access errors and continue with fallbacks.
      }

      try {
        if (window.parent && window.parent !== window) {
          window.parent.location.replace(absoluteUrl);
        }
      } catch {
        // Ignore and continue.
      }

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = absoluteUrl;
          window.close();
        }
      } catch {
        // Ignore and continue.
      }

      forceCurrentTabNavigation();

      // Fallback in case another context interception prevents replace from taking effect.
      window.setTimeout(() => {
        if (window.location.pathname.includes("/payment/chapa-return")) {
          window.location.assign(absoluteUrl);
        }
      }, 300);
    };

    if (!txRef) {
      setMessage("Payment reference not found. Redirecting to your payments page...");
      navigateNow("/dashboard/student/payments");
      return;
    }

    let isCancelled = false;
    let hasNavigated = false;
    const nextUrl = `/dashboard/student/payments?tx_ref=${encodeURIComponent(txRef)}`;
    setTargetUrl(nextUrl);

    const ensureNavigate = () => {
      if (hasNavigated || isCancelled) return;
      hasNavigated = true;
      navigateNow(nextUrl);
    };

    // Never let verification keep the user trapped on this page.
    const redirectTimer = window.setTimeout(() => {
      setMessage("Redirecting to your payment receipt...");
      ensureNavigate();
    }, 2500);

    const finalize = async () => {
      try {
        await Promise.race([
          fetchApi(`/payments/verify/${encodeURIComponent(txRef)}`),
          new Promise((resolve) => window.setTimeout(resolve, 5000)),
        ]);
        if (isCancelled) return;
        setMessage("Payment verified. Redirecting...");
        ensureNavigate();
      } catch (error) {
        if (isCancelled) return;
        const text = error instanceof Error ? error.message : "Unable to verify payment right now.";
        setMessage(`${text} Redirecting to payments...`);
        ensureNavigate();
      } finally {
        window.clearTimeout(redirectTimer);
      }
    };

    finalize();

    return () => {
      isCancelled = true;
      window.clearTimeout(redirectTimer);
    };
  }, [txRef]);

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <section className="mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-serif font-extrabold text-primary">Completing Payment</h1>
        <p className="mt-3 text-sm text-secondary">{message}</p>
        <button
          type="button"
          onClick={() => {
            const absoluteUrl = new URL(targetUrl, window.location.origin).toString();
            try {
              if (window.top && window.top !== window) {
                window.top.location.href = absoluteUrl;
              }
            } catch {
              // Ignore and use fallback below.
            }

            if (window.location.href !== absoluteUrl) {
              window.location.replace(absoluteUrl);
            }

            window.setTimeout(() => {
              if (window.location.pathname.includes("/payment/chapa-return")) {
                window.location.assign(absoluteUrl);
              }
            }, 300);
          }}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background"
        >
          Continue Now
        </button>
        <p className="mt-2 text-xs text-secondary/70">If redirect does not happen automatically, click Continue Now.</p>
        <a
          href={targetUrl}
          target="_top"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-2"
        >
          Open Receipt Page
        </a>
      </section>
    </main>
  );
}
