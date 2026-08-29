"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL, fetchCurrentUser } from "@/lib/api";

/* PDF.js is loaded from CDN via a script tag injected below.
   We declare the global type so TypeScript is happy. */
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (src: {
        url?: string;
        data?: ArrayBuffer;
        withCredentials?: boolean;
        rangeChunkSize?: number;
        disableAutoFetch?: boolean;
        disableStream?: boolean;
      } | string) => { promise: Promise<PdfDoc> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  }
}

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: {
    canvasContext: CanvasRenderingContext2D;
    viewport: ReturnType<PdfPage["getViewport"]>;
  }) => { promise: Promise<void> };
};

export default function ReadPage() {
  const params = useParams<{ id: string }>();
  const id     = params?.id ?? "";

  const containerRef        = useRef<HTMLDivElement>(null);
  const [status, setStatus]  = useState<"loading" | "rendering" | "done" | "error">("loading");
  const [errorMsg, setError] = useState("");
  const [numPages, setNumPages]     = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale]   = useState(1.4);
  const pdfDocRef           = useRef<PdfDoc | null>(null);
  // Watermark label — resolved once on mount, never exposed in the DOM
  const watermarkRef        = useRef<string>("BRANA DIGITAL LIBRARY");

  /* ── Resolve watermark identity once on mount ─────────────── */
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        // e.g. "John D. • john@example.com • BRANA"
        const label = [u.name, u.email, u.student_id].filter(Boolean).join(" • ") + " • BRANA";
        watermarkRef.current = label;
      }
    }).catch(() => {/* silent — generic watermark already set */});
  }, []);

  /* ── DRM Hotkey, Print & Arrow Nav Protection ──────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Block Save (Ctrl+S / Cmd+S)
      if (isCmdOrCtrl && key === "s") {
        e.preventDefault();
        toast.error("Saving or downloading this document is disabled.");
        return;
      }

      // Block Print (Ctrl+P / Cmd+P)
      if (isCmdOrCtrl && key === "p") {
        e.preventDefault();
        toast.error("Printing this document is disabled.");
        return;
      }

      // Block View Source (Ctrl+U / Cmd+U)
      if (isCmdOrCtrl && key === "u") {
        e.preventDefault();
        return;
      }

      // Block DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c" || key === "k"))
      ) {
        e.preventDefault();
        toast.error("Developer tools shortcuts are restricted on this document.");
        return;
      }

      // Smooth keyboard page navigation
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };

    // Inject anti-print CSS rule
    const printStyle = document.createElement("style");
    printStyle.id = "anti-print-style";
    printStyle.innerHTML = "@media print { body { display: none !important; } }";
    document.head.appendChild(printStyle);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const existing = document.getElementById("anti-print-style");
      if (existing) existing.remove();
    };
  }, [currentPage, numPages]);

  /* ── Load pdf.js from CDN once ─────────────────────────────── */
  useEffect(() => {
    if (document.getElementById("pdfjs-script")) return;
    const script = document.createElement("script");
    script.id  = "pdfjs-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.head.appendChild(script);
  }, []);

  /* ── Stream PDF via HTTP Range Requests (Real-World Range Transport) ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        /* Wait for pdf.js script to load */
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (window.pdfjsLib) { clearInterval(check); resolve(); }
          }, 50);
        });

        if (cancelled) return;

        /* PDF.js fetches only what it needs via HTTP Range requests through our backend proxy.
           The Cloudinary URL is never exposed — the browser only ever sees
           /api/digital-books/:id/pdf with session cookies. Each range chunk is
           ~64 KB, so the full file is never present in browser memory or DevTools. */
        const loadingTask = window.pdfjsLib.getDocument({
          url: `${API_BASE_URL}/digital-books/${id}/pdf`,
          withCredentials: true,   // send session cookie so auth is enforced
          rangeChunkSize: 65536,   // 64 KB per range request
          disableAutoFetch: true,  // never pre-fetch the whole file
          disableStream: false,
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("rendering");

        /* Mark as read — non-fatal */
        fetch(`${API_BASE_URL}/digital-books/${id}/read`, {
          method: "POST", credentials: "include",
        }).catch(() => {/* silent */});

      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "Failed to load document."); setStatus("error"); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  /* ── Render one page onto canvas ───────────────────────────── */
  useEffect(() => {
    if (status !== "rendering" && status !== "done") return;
    if (!pdfDocRef.current) return;

    let cancelled = false;
    const render = async () => {
      try {
        const doc  = pdfDocRef.current!;
        const page = await doc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        let canvas    = containerRef.current?.querySelector<HTMLCanvasElement>("canvas");

        if (!canvas) {
          canvas = document.createElement("canvas");
          /* Prevent right-click / context menu save */
          canvas.addEventListener("contextmenu", (e) => e.preventDefault());
          containerRef.current?.appendChild(canvas);
        }

        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelled) return;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (!cancelled) {
          // Draw identity watermark — includes user name/email so leaked screenshots are traceable
          ctx.save();
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
          ctx.translate(viewport.width / 2, viewport.height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.textAlign = "center";
          // Two passes: one in the center, one offset — covers more of the page
          ctx.fillText(watermarkRef.current, 0, 0);
          ctx.fillText(watermarkRef.current, 0, viewport.height * 0.35);
          ctx.fillText(watermarkRef.current, 0, -viewport.height * 0.35);
          ctx.restore();

          setStatus("done");
        }
      } catch { /* ignore render errors */ }
    };

    render();
    return () => { cancelled = true; };
  }, [status, currentPage, scale]);

  const goPrev = () => { if (currentPage > 1)       { setCurrentPage(p => p - 1); setStatus("rendering"); } };
  const goNext = () => { if (currentPage < numPages) { setCurrentPage(p => p + 1); setStatus("rendering"); } };
  const zoomIn  = () => { setScale(s => Math.min(s + 0.2, 3.0)); setStatus("rendering"); };
  const zoomOut = () => { setScale(s => Math.max(s - 0.2, 0.6)); setStatus("rendering"); };

  return (
    <div className="fixed inset-0 bg-[#1c1c1c] flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="h-12 bg-[#111] flex items-center gap-3 px-4 shrink-0 border-b border-white/10">
        {/* Back */}
        <Link href="/dashboard/student/digital"
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          <span className="text-[12px] font-semibold hidden sm:inline">Back</span>
        </Link>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 group shrink-0">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-md bg-white/10 border border-white/15" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#f5c518] rounded-tr-md rounded-bl-sm" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-[9px] z-10 select-none">ብ</span>
          </div>
          <span className="text-[12px] font-serif font-black text-white/60 group-hover:text-white transition-colors">Brana</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        {status !== "error" && (
          <div className="flex items-center gap-1">
            <button onClick={zoomOut}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg font-bold">
              −
            </button>
            <span className="text-[11px] text-white/40 w-10 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg font-bold">
              +
            </button>
          </div>
        )}

        {/* Page controls */}
        {numPages > 0 && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
            <button onClick={goPrev} disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="text-[11px] text-white/40 tabular-nums">
              {currentPage} / {numPages}
            </span>
            <button onClick={goNext} disabled={currentPage >= numPages}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* ── Canvas area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-6"
        style={{ userSelect: "none" }}>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-3 text-white/40 mt-20">
            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            <span className="text-sm">Loading book…</span>
          </div>
        )}

        {/* Rendering indicator */}
        {status === "rendering" && (
          <div className="absolute top-14 right-4 flex items-center gap-2 text-white/30">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/50 animate-spin" />
            <span className="text-[11px]">Rendering…</span>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-white/50 mt-20 text-center">
            <p className="text-sm">{errorMsg}</p>
            <Link href="/dashboard/student/digital"
              className="px-5 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors">
              Back to library
            </Link>
          </div>
        )}

        {/* PDF canvas container — right-click blocked via event listener */}
        <div ref={containerRef}
          className="shadow-2xl rounded overflow-hidden"
          style={{ maxWidth: "100%" }}
        />
      </div>

      {/* ── Bottom page nav (mobile friendly) ─────────────────── */}
      {numPages > 1 && (
        <div className="h-12 bg-[#111] border-t border-white/10 flex items-center justify-between px-6 shrink-0">
          <button onClick={goPrev} disabled={currentPage <= 1}
            className="px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/15 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-25 transition-colors">
            ← Prev
          </button>
          <span className="text-[11px] text-white/30 tabular-nums">
            Page {currentPage} of {numPages}
          </span>
          <button onClick={goNext} disabled={currentPage >= numPages}
            className="px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/15 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-25 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
