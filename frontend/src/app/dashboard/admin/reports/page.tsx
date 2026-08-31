"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { API_BASE_URL, fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import { Download, FileSpreadsheet, FileText, Table2, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const REPORT_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; desc: string }> = {
  rentals:      { icon: "📚", color: "#1E3A5F", bg: "#EFF6FF", border: "#BFDBFE", desc: "All book borrowing records with student & book details" },
  overdue:      { icon: "⚠️", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA", desc: "Currently overdue rentals with fine estimates" },
  users:        { icon: "👥", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", desc: "Student accounts with activity & fine summaries" },
  inventory:    { icon: "📦", color: "#4C1D95", bg: "#F5F3FF", border: "#DDD6FE", desc: "Physical book stock levels and condition details" },
  reservations: { icon: "🔖", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", desc: "Book reservation queue with wait time data" },
};

const FORMAT_CONFIG = [
  { key: "csv",   label: "CSV",   icon: <Table2 size={14}/>,         desc: "Spreadsheet-compatible",  ext: "csv"  },
  { key: "excel", label: "Excel", icon: <FileSpreadsheet size={14}/>, desc: "Formatted .xlsx workbook", ext: "xlsx" },
  { key: "pdf",   label: "PDF",   icon: <FileText size={14}/>,        desc: "Print-ready report",       ext: "pdf"  },
] as const;

import { Search } from "lucide-react";
import { matchesMultiLangQuery } from "@/lib/multiLangSearch";

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const [active, setActive] = useState("rentals");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((row) =>
      Object.values(row).some((val) => matchesMultiLangQuery(val, search))
    );
  }, [rows, search]);

  const REPORTS = [
    { key: "rentals",      label: String(t("admin_reports.types.rentals"))      || "Rentals" },
    { key: "overdue",      label: String(t("admin_reports.types.overdue"))       || "Overdue" },
    { key: "users",        label: String(t("admin_reports.types.users"))         || "Users" },
    { key: "inventory",    label: String(t("admin_reports.types.inventory"))     || "Inventory" },
    { key: "reservations", label: String(t("admin_reports.types.reservations"))  || "Reservations" },
  ];

  const load = useCallback(async (type: string) => {
    setLoading(true);
    setActive(type);
    try {
      const d = await fetchApi(`/admin/reports/export?type=${type}&format=json`);
      setRows(d?.data?.rows || []);
      setLastLoaded(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load report data";
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load rentals on mount
  useEffect(() => { load("rentals"); }, [load]);

  const handleExport = async (fmt: string) => {
    setExporting(fmt);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/export?type=${active}&format=${fmt}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as {message?: string}).message || "Export failed");
      }
      const blob = await res.blob();
      const ext = fmt === "excel" ? "xlsx" : fmt;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brana-${active}-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${active} report exported as ${ext.toUpperCase()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  };

  const headers = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  const cols = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(
    () =>
      headers.map((h) => ({
        id: h,
        accessorKey: h,
        header: h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        cell: ({ row }) => {
          const val = String(row.original[h] ?? "");
          const isStatus = h === "status" || h === "account_status" || h === "stock_status" || h === "severity";
          const isNum = !isNaN(Number(val)) && val.trim() !== "" && val !== "";
          if (isStatus && val) {
            const statusColors: Record<string, string> = {
              BORROWED: "bg-blue-50 text-blue-700 border-blue-200",
              RETURNED: "bg-green-50 text-green-700 border-green-200",
              COMPLETED: "bg-gray-50 text-gray-700 border-gray-200",
              PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
              Active: "bg-green-50 text-green-700 border-green-200",
              Blocked: "bg-red-50 text-red-700 border-red-200",
              Unconfirmed: "bg-gray-50 text-gray-600 border-gray-200",
              "OUT OF STOCK": "bg-red-50 text-red-700 border-red-200",
              "LOW STOCK": "bg-orange-50 text-orange-700 border-orange-200",
              "IN STOCK": "bg-green-50 text-green-700 border-green-200",
              CRITICAL: "bg-red-100 text-red-800 border-red-300",
              HIGH: "bg-orange-50 text-orange-700 border-orange-200",
              MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
              LOW: "bg-blue-50 text-blue-700 border-blue-200",
              QUEUED: "bg-purple-50 text-purple-700 border-purple-200",
              NOTIFIED: "bg-indigo-50 text-indigo-700 border-indigo-200",
              FULFILLED: "bg-green-50 text-green-700 border-green-200",
              EXPIRED: "bg-gray-50 text-gray-500 border-gray-200",
              CANCELLED: "bg-red-50 text-red-600 border-red-200",
            };
            const cls = statusColors[val] || "bg-gray-50 text-gray-600 border-gray-200";
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{val}</span>;
          }
          if (h.includes("etb") || h.includes("fine") || h.includes("price")) {
            return <span className="text-[11px] font-mono text-[#0d0d0d]/80 tabular-nums">{val ? `${val} ETB` : ""}</span>;
          }
          if (isNum && (h.includes("days") || h.includes("count") || h.includes("total") || h.includes("copies"))) {
            return <span className="text-[11px] font-mono text-[#0d0d0d]/80 tabular-nums">{val}</span>;
          }
          return <span className="text-[11px] text-[#0d0d0d]/70 truncate block max-w-[160px]" title={val}>{val}</span>;
        },
      })),
    [headers],
  );

  const cfg = REPORT_CONFIG[active];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
          {String(t("admin_reports.title")) || "Reports & Export"}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">
          {String(t("admin_reports.subtitle")) || "Generate detailed reports with rich data for every category."}
        </p>
      </motion.div>

      {/* Report type pills */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {REPORTS.map((r) => {
          const c = REPORT_CONFIG[r.key];
          const isActive = active === r.key;
          return (
            <button
              key={r.key}
              id={`report-tab-${r.key}`}
              onClick={() => load(r.key)}
              disabled={loading}
              style={isActive ? { background: c.color, borderColor: c.color } : {}}
              className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all border flex items-center gap-1.5 ${
                isActive
                  ? "text-white shadow-md"
                  : "bg-white border-[#e8e4dc] text-[#0d0d0d]/60 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30"
              }`}
            >
              <span>{c.icon}</span> {r.label}
            </button>
          );
        })}
      </motion.div>

      {/* Active report context card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          style={{ background: cfg.bg, borderColor: cfg.border }}
          className="rounded-2xl border px-5 py-3 flex items-start gap-3"
        >
          <span className="text-2xl mt-0.5">{cfg.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: cfg.color }}>
              {REPORTS.find((r) => r.key === active)?.label}
            </p>
            <p className="text-xs text-[#0d0d0d]/50 mt-0.5">{cfg.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            {lastLoaded && (
              <span className="text-[10px] text-[#0d0d0d]/40">
                Updated {lastLoaded.toLocaleTimeString()}
              </span>
            )}
            <button
              id="report-refresh-btn"
              onClick={() => load(active)}
              disabled={loading}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} style={{ color: cfg.color }} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Export buttons & search */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black text-[#0d0d0d]/30 uppercase tracking-widest mr-1">Export:</span>
          {FORMAT_CONFIG.map((fmt) => {
            const isLoading = exporting === fmt.key;
            return (
              <button
                key={fmt.key}
                id={`export-${fmt.key}-btn`}
                onClick={() => handleExport(fmt.key)}
                disabled={!!exporting || rows.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[12px] font-bold transition-all
                  ${rows.length === 0 ? "opacity-40 cursor-not-allowed" : "hover:shadow-md active:scale-95"}
                  bg-white border-[#e8e4dc] text-[#0d0d0d]/70 hover:border-[#0d0d0d]/30 hover:text-[#0d0d0d]`}
              >
                {isLoading ? <RefreshCw size={13} className="animate-spin" /> : fmt.icon}
                {fmt.label}
                {!isLoading && (
                  <span className="text-[9px] text-[#0d0d0d]/30 font-normal">.{fmt.ext}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0d0d0d]/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={String(t("common.search"))} className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#e8e4dc] bg-white text-[#0d0d0d] placeholder:text-[#0d0d0d]/30 focus:outline-none focus:border-[#0d0d0d]" />
        </div>
      </motion.div>

      {/* Preview table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e8e4dc] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-[#0d0d0d]/40 uppercase tracking-widest">Preview</p>
            {filteredRows.length > 0 && (
              <p className="text-[10px] text-[#0d0d0d]/30 mt-0.5">
                Showing first {Math.min(filteredRows.length, 50)} of {filteredRows.length.toLocaleString()} rows • {headers.length} columns
              </p>
            )}
          </div>
          {filteredRows.length > 0 && (
            <span className="text-[10px] text-[#0d0d0d]/30 italic">Scroll right to see all columns →</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <TanStackTable
            data={filteredRows.slice(0, 50)}
            columns={cols}
            isLoading={loading}
            emptyText={String(t("admin_reports.select_report")) || "Select a report type to preview data"}
            skeletonRows={5}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
