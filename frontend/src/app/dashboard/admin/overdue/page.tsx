"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useOverdueRentals, useOverdueRanking, useSendReminders } from "@/lib/hooks/useQueries";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";

type OverdueRental = {
  id: string;
  due_date: string;
  daysOverdue: number;
  estimatedFine: number;
  user: { name: string; email: string };
  physical_book: { title: string };
};

type OverdueRank = {
  user: { id: string; name: string; email: string };
  overdueCount: number;
  totalDaysOverdue: number;
  totalEstimatedFine: number;
};

export default function AdminOverduePage() {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const { data: overdueData, isLoading: overdueLoading } = useOverdueRentals();
  const { data: rankingData } = useOverdueRanking();
  const sendReminders = useSendReminders();
  const { t } = useLanguage();

  const rows: OverdueRental[] = (overdueData?.rentals || []) as unknown as OverdueRental[];
  const ranking: OverdueRank[] = ((rankingData as unknown as { ranking?: OverdueRank[] })?.ranking ||
    []) as OverdueRank[];

  const maxDays = Math.max(1, ...ranking.map((r) => r.totalDaysOverdue));

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSendReminders = async () => {
    try {
      await sendReminders.mutateAsync({ rentalIds: Array.from(selectedIds) });
      toast.success(t("admin_overdue.messages.reminders_success"));
      setSelectedIds(new Set());
    } catch {
      toast.error(t("admin_overdue.messages.reminders_failed"));
    }
  };

  const columns: ColumnDef<OverdueRental, unknown>[] = [
    {
      id: "select",
      header: () => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={rows.length > 0 && selectedIds.size === rows.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            aria-label={t("admin_overdue.select_all") || "Select all overdue rows"}
            title={t("admin_overdue.select_all") || "Select all overdue rows"}
            className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => handleToggleSelect(row.original.id)}
            aria-label={
              t("admin_overdue.select_row", { name: row.original.user.name }) ||
              `Select overdue row for ${row.original.user.name}`
            }
            title={
              t("admin_overdue.select_row", { name: row.original.user.name }) ||
              `Select overdue row for ${row.original.user.name}`
            }
            className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
          />
        </div>
      ),
    },
    {
      id: "student",
      header: t("admin_overdue.table.student"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-[#111111]">{row.original.user.name}</p>
          <p className="text-xs text-[#142B6F]">{row.original.user.email}</p>
        </div>
      ),
    },
    {
      id: "book",
      header: t("admin_overdue.table.book"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111] truncate block">{row.original.physical_book.title}</span>
      ),
    },
    {
      id: "due_date",
      header: t("admin_overdue.table.due_date"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{new Date(row.original.due_date).toLocaleDateString()}</span>
      ),
    },
    {
      id: "days_overdue",
      header: t("admin_overdue.table.days_overdue"),
      cell: ({ row }) => <span className="text-sm font-bold text-red-700">{row.original.daysOverdue}</span>,
    },
    {
      id: "estimated_fine",
      header: t("admin_overdue.table.estimated_fine"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{Number(row.original.estimatedFine).toFixed(2)} ETB</span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
            {t("admin_overdue.title")}
          </h1>
          <p className="text-[#142B6F] font-medium">{t("admin_overdue.subtitle")}</p>
        </div>
        <button
          onClick={handleSendReminders}
          disabled={sendReminders.isPending || selectedIds.size === 0}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-opacity"
        >
          {sendReminders.isPending
            ? t("admin_overdue.sending")
            : t("admin_overdue.send_reminder", { count: selectedIds.size })}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">{t("admin_overdue.ranking_title")}</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-[#142B6F]">{t("admin_overdue.no_ranking")}</p>
        ) : (
          ranking.map((item, idx) => (
            <div key={item.user.id} className="space-y-1">
              <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-bold text-[#111111]">
                  #{idx + 1} {item.user.name}
                </span>
                <span className="text-[#142B6F]">
                  {item.totalDaysOverdue} {t("admin_overdue.days")} • {item.totalEstimatedFine.toFixed(2)} ETB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E1DEE5] overflow-hidden">
                <div className="h-full bg-[#142B6F]" style={{ width: `${(item.totalDaysOverdue / maxDays) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
        <TanStackTable
          data={rows}
          columns={columns}
          isLoading={overdueLoading}
          skeletonRows={5}
          emptyText={t("admin_overdue.table.no_overdue")}
        />
      </div>
    </div>
  );
}
