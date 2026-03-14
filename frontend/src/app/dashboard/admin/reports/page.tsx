"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { API_BASE_URL, fetchApi } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";

export default function AdminReportsPage() {
  const [active, setActive] = useState("rentals");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const REPORTS = [
    { key: "rentals", label: t("admin_reports.types.rentals") },
    { key: "overdue", label: t("admin_reports.types.overdue") },
    { key: "users", label: t("admin_reports.types.users") },
    { key: "inventory", label: t("admin_reports.types.inventory") },
    { key: "reservations", label: t("admin_reports.types.reservations") },
  ];

  const loadPreview = async (type: string) => {
    setLoading(true);
    setActive(type);
    try {
      const data = await fetchApi(`/admin/reports/export?type=${type}&format=json`);
      setRows(data?.data?.rows || []);
    } catch {
      toast.error(t("admin_reports.messages.load_failed"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : []), [rows]);

  const columns = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(
    () =>
      headers.map((header) => ({
        header,
        cell: ({ row }) => (
          <span className="truncate block text-sm text-[#111111]/80">{String(row.original[header] ?? "")}</span>
        ),
      })),
    [headers],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
          {t("admin_reports.title")}
        </h1>
        <p className="text-[#142B6F] font-medium">{t("admin_reports.subtitle")}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REPORTS.map((report) => (
          <button
            key={report.key}
            onClick={() => loadPreview(report.key)}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold ${active === report.key ? "bg-[#142B6F] text-white" : "bg-white border border-[#E1DEE5] text-[#111111]"}`}
          >
            {report.label}
          </button>
        ))}
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=csv`}
          className="w-full sm:w-auto text-center px-4 py-2 rounded-xl text-sm font-bold bg-[#142B6F] text-white"
        >
          {t("admin_reports.download_csv")}
        </a>
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=excel`}
          className="w-full sm:w-auto text-center px-4 py-2 rounded-xl text-sm font-bold bg-[#142B6F] text-white"
        >
          {t("admin_reports.download_excel")}
        </a>
        <a
          href={`${API_BASE_URL}/admin/reports/export?type=${active}&format=pdf`}
          className="w-full sm:w-auto text-center px-4 py-2 rounded-xl text-sm font-bold bg-[#142B6F] text-white"
        >
          {t("admin_reports.download_pdf")}
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
        <TanStackTable
          data={rows.slice(0, 20)}
          columns={columns}
          isLoading={loading}
          emptyText={t("admin_reports.select_report")}
          skeletonRows={5}
        />
      </div>
    </div>
  );
}
