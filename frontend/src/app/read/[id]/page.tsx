"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL, fetchCurrentUser } from "@/lib/api";

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

  const scrollRef  = useRef<HTMLDivElement>(null);
  const pageRefs   = useRef<(HTMLDivElement | null)[]>([]);

  const [status, setStatus]       = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setError]      = useState("");
  const [numPages, setNumPages]   = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale]         = useState(1.4);

  const pdfDocRef    = useRef<PdfDoc | null>(null);
  const watermarkRef = useRef<string>("BRANA DIGITAL LIBRARY");
  // Track which pages have been rendered at the current scale
  const renderedRef  = useRef<Set<number>>(new Set());
  const renderingRef = useRef<Set<number>>(new Set());
  const scaleRef     = useRef(scale);

  /* ── Watermark identity ────────────────────────────────────── */
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        watermarkRef.current =
          [u.name, u.email, u.student_id].filter(Boolean).join(" • ") + " • BRANA";
      }
    }).catch(() => {});
  }, []);

  /* ── DRM: keyboard protection ──────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isCmdOrCtrl && key === "s") {
        e.preventDefault();
        toast.error("Saving or downloading this document is disabled.");
        return;
      }
      if (isCmdOrCtrl && key === "p") {
        e.preventDefault();
        toast.error("Printing this document is disabled.");
        return;
      }
      if (isCmdOrCtrl && key === "u") { e.preventDefault(); return; }
      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c" || key === "k"))
      ) {
        e.preventDefault();
        toast.error("Developer tools shortcuts are restricted on this document.");
        return;
      }
      // Arrow keys scroll to prev/next page
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") scrollToPage(currentPage - 1);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") scrollToPage(currentPage + 1);
    };

    const printStyle = document.createElement("style");
    printStyle.id = "anti-print-style";
    printStyle.innerHTML = "@media print { body { display: none !important; } }";
    document.head.appendChild(printStyle);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.getElementById("anti-print-style")?.remove();
    };
  }, [currentPage, numPages]);

  /* ── Load pdf.js from CDN ──────────────────────────────────── */
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

  /* ── Render a single page onto its canvas ──────────────────── */
  const renderPage = useCallback(async (pageNum: number, currentScale: number) => {
    const doc = pdfDocRef.current;
    if (!doc) return;
    if (renderingRef.current.has(pageNum)) return;

    const container = pageRefs.current[pageNum - 1];
    if (!container) return;

    renderingRef.current.add(pageNum);

    try {
      const page     = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentScale });

      let canvas = container.querySelector<HTMLCanvasElement>("canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        container.appendChild(canvas);
      }

      // If scale changed, clear the rendered flag and resize
      if (
        canvas.width  !== Math.floor(viewport.width) ||
        canvas.height !== Math.floor(viewport.height)
      ) {
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        // Also resize the placeholder so layout doesn't jump
        container.style.width  = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Identity watermark
      ctx.save();
      ctx.font      = "bold 18px sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.translate(viewport.width / 2, viewport.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.textAlign = "center";
      ctx.fillText(watermarkRef.current, 0, 0);
      ctx.fillText(watermarkRef.current, 0,  viewport.height * 0.35);
      ctx.fillText(watermarkRef.current, 0, -viewport.height * 0.35);
      ctx.restore();

      renderedRef.current.add(pageNum);
    } catch {
      /* ignore individual page render errors */
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, []);

  /* ── Load document and create page placeholders ────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (window.pdfjsLib) { clearInterval(check); resolve(); }
          }, 50);
        });
        if (cancelled) return;

        const doc = await window.pdfjsLib.getDocument({
          url: `${API_BASE_URL}/digital-books/${id}/pdf`,
          withCredentials: true,
          rangeChunkSize: 65536,
          disableAutoFetch: true,
          disableStream: true,
        }).promise;

        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("ready");

        fetch(`${API_BASE_URL}/digital-books/${id}/read`, {
          method: "POST", credentials: "include",
        }).catch(() => {});
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load document.");
          setStatus("error");
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  /* ── IntersectionObserver: track which page is in view ─────── */
  useEffect(() => {
    if (status !== "ready" || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most-visible page
        let best = 0;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = pageNum;
          }
        });
        if (best > 0) setCurrentPage(best);
      },
      { root: scrollRef.current, threshold: [0.1, 0.5, 0.9] }
    );

    pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [status, numPages]);

  /* ── Lazy-render pages as they enter the viewport ──────────── */
  useEffect(() => {
    if (status !== "ready" || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (!renderedRef.current.has(pageNum)) {
            renderPage(pageNum, scaleRef.current);
          }
        });
      },
      { root: scrollRef.current, rootMargin: "200px 0px" }
    );

    pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [status, numPages, renderPage]);

  /* ── Re-render all already-rendered pages when scale changes── */
  useEffect(() => {
    scaleRef.current = scale;
    if (status !== "ready" || numPages === 0) return;
    // Clear rendered set so all visible pages get re-rendered at new scale
    renderedRef.current = new Set();
    renderingRef.current = new Set();
    // Re-render pages that are currently visible
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight + 200 && rect.bottom > -200;
      if (inView) renderPage(i + 1, scale);
    });
  }, [scale, status, numPages, renderPage]);

  /* ── Scroll to a specific page ─────────────────────────────── */
  const scrollToPage = (pageNum: number) => {
    const target = pageNum < 1 ? 1 : pageNum > numPages ? numPages : pageNum;
    const el = pageRefs.current[target - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const zoomIn  = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));

  return (
    <div
      className="fixed inset-0 bg-[#1c1c1c] flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="h-12 bg-[#111] flex items-center gap-3 px-4 shrink-0 border-b border-white/10 z-10">
        <Link
          href="/dashboard/student/digital"
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          <span className="text-[12px] font-semibold hidden sm:inline">Back</span>
        </Link>

        <div className="h-4 w-px bg-white/10 mx-1" />

        <Link href="/" className="flex items-center gap-1.5 group shrink-0">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-md bg-white/10 border border-white/15" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#f5c518] rounded-tr-md rounded-bl-sm" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-[9px] z-10 select-none">ብ</span>
          </div>
          <span className="text-[12px] font-serif font-black text-white/60 group-hover:text-white transition-colors">Brana</span>
        </Link>

        <div className="flex-1" />

        {/* Zoom */}
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

        {/* Page indicator + jump buttons */}
        {numPages > 0 && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
            <button
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="text-[11px] text-white/40 tabular-nums">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* ── Scroll area ─────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ userSelect: "none" }}
      >
        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-3 text-white/40 justify-center mt-20">
            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            <span className="text-sm">Loading book…</span>
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

        {/* Page placeholders — one div per page, canvas rendered lazily */}
        {status === "ready" && (
          <div className="flex flex-col items-center gap-6 py-6">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                data-page={pageNum}
                ref={(el) => { pageRefs.current[pageNum - 1] = el; }}
                className="relative bg-white shadow-2xl rounded overflow-hidden"
                style={{
                  // Reserve approximate A4 space before canvas renders
                  minWidth: "400px",
                  minHeight: "565px",
                }}
              >
                {/* Page number badge */}
                <div className="absolute bottom-2 right-3 text-[10px] text-black/20 select-none pointer-events-none z-10">
                  {pageNum}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
