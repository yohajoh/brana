"use client";

import { useState } from "react";
import { MoreHorizontal, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useReservations,
  useExpireReservations,
  useMoveReservationToTop,
  useIssueReservation,
  useReservationHighDemand,
  type HighDemandReservationBook,
} from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

type Reservation = {
  id: string;
  status: string;
  queue_position: number;
  reserved_at: string;
  notified_at?: string | null;
  fulfilled_at?: string | null;
  expires_at?: string | null;
  user_debt_total?: number;
  user: { name: string; email: string; student_id?: string | null };
  book: { id: string; title: string; available: number; copies?: number };
};

export default function AdminReservationsPage() {
  const { t } = useLanguage();
  const [openMenuReservationId, setOpenMenuReservationId] = useState<string | null>(null);
  const [issueModalReservation, setIssueModalReservation] = useState<Reservation | null>(null);
  const [issueCopyCode, setIssueCopyCode] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: reservationsData, isLoading } = useReservations();
  const { data: highDemandData, isLoading: highDemandLoading } = useReservationHighDemand("limit=6&min_queue=3");
  const expireReservations = useExpireReservations();
  const moveToTop = useMoveReservationToTop();
  const issueReservation = useIssueReservation();

  const reservations: Reservation[] = (reservationsData?.reservations || []) as unknown as Reservation[];
  const highDemand = (highDemandData?.data?.books || []) as HighDemandReservationBook[];

  const handleCancelReservations = async () => {
    try {
      const result = await expireReservations.mutateAsync({
        notifyUsers: false,
        reservationIds: Array.from(selectedIds),
      });
      const count = Number(result?.data?.expiredCount ?? 0);
      if (count === 0) {
        toast.info(t("admin_reservations.messages.no_cancelled"));
        return;
      }
      toast.success(t("admin_reservations.messages.cancel_success", { count }));
      setSelectedIds(new Set()); // Clear selection after success
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin_reservations.messages.default_error") || "Failed to cancel reservations",
      );
    }
  };

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
      setSelectedIds(new Set(reservations.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleMoveToTop = async (id: string) => {
    try {
      await moveToTop.mutateAsync(id);
      toast.success(t("admin_reservations.messages.move_success"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin_reservations.messages.default_error") || "Failed to move reservation",
      );
    }
  };

  const handleOpenIssueModal = (item: Reservation) => {
    setIssueModalReservation(item);
    setIssueCopyCode("");
  };

  const handleConfirmIssue = async () => {
    if (!issueModalReservation) return;
    if (!issueCopyCode.trim()) {
      toast.error(t("admin_reservations.messages.copy_code_required"));
      return;
    }
    try {
      await issueReservation.mutateAsync({ id: issueModalReservation.id, copy_code: issueCopyCode.trim() });
      toast.success(t("admin_reservations.messages.issue_success"));
      setIssueModalReservation(null);
      setIssueCopyCode("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("admin_reservations.messages.default_error") || "Failed to issue reservation",
      );
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const reservationColumns: ColumnDef<Reservation, unknown>[] = [
    {
      id: "select",
      header: () => (
        <span className="flex justify-center">
          <input
            type="checkbox"
            checked={reservations.length > 0 && selectedIds.size === reservations.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            aria-label={t("admin_reservations.select_all") || "Select all reservations"}
            title={t("admin_reservations.select_all") || "Select all reservations"}
            className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
          />
        </span>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => handleToggleSelect(row.original.id)}
            aria-label={
              t("admin_reservations.select_row", { name: row.original.user.name }) ||
              `Select reservation for ${row.original.user.name}`
            }
            title={
              t("admin_reservations.select_row", { name: row.original.user.name }) ||
              `Select reservation for ${row.original.user.name}`
            }
            className="w-4 h-4 rounded border-[#E1DEE5] text-[#111111] focus:ring-[#111111]"
          />
        </div>
      ),
    },
    {
      id: "student",
      header: t("admin_reservations.table.student"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-[#111111] truncate">{row.original.user.name}</p>
          <p className="text-xs text-[#142B6F] truncate">{row.original.user.email}</p>
        </div>
      ),
    },
    {
      id: "book",
      header: t("admin_reservations.table.book"),
      cell: ({ row }) => <p className="text-sm text-[#111111] truncate">{row.original.book.title}</p>,
    },
    {
      id: "queue",
      header: t("admin_reservations.table.queue"),
      cell: ({ row }) => <span className="text-sm text-[#111111]/70">#{row.original.queue_position}</span>,
    },
    {
      id: "status",
      header: t("admin_reservations.table.status"),
      cell: ({ row }) => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#E1DEE5] text-[#111111] w-fit block">
          {row.original.status}
        </span>
      ),
    },
    {
      id: "debt",
      header: t("admin_reservations.table.debt"),
      cell: ({ row }) => (
        <span
          className={`text-sm ${Number(row.original.user_debt_total || 0) > 0 ? "text-red-700 font-bold" : "text-[#111111]/70"}`}
        >
          {Number(row.original.user_debt_total || 0) > 0
            ? `${Number(row.original.user_debt_total).toFixed(2)} ETB`
            : t("admin_reservations.table.clear")}
        </span>
      ),
    },
    {
      id: "reserved",
      header: t("admin_reservations.table.reserved"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{new Date(row.original.reserved_at).toLocaleDateString()}</span>
      ),
    },
    {
      id: "expires",
      header: t("admin_reservations.table.expires"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">
          {row.original.expires_at ? new Date(row.original.expires_at).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      id: "action",
      header: t("admin_reservations.table.action"),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="relative flex justify-end" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label={`Open actions for reservation ${item.id}`}
              onClick={() => setOpenMenuReservationId((current) => (current === item.id ? null : item.id))}
              className="h-9 w-9 rounded-full border border-[#E1DEE5] bg-[#FFFFFF] text-[#142B6F] flex items-center justify-center"
            >
              <MoreHorizontal size={16} />
            </button>

            {openMenuReservationId === item.id ? (
              <div className="absolute right-0 top-11 z-2147483647 min-w-48 overflow-hidden sm:min-w-52 rounded-xl border border-[#E1DEE5] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <button
                  type="button"
                  disabled={item.status !== "QUEUED" || moveToTop.isPending}
                  onClick={() => {
                    setOpenMenuReservationId(null);
                    void handleMoveToTop(item.id);
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF] disabled:opacity-40"
                >
                  {t("admin_reservations.actions.move_to_top")}
                </button>
                <button
                  type="button"
                  disabled={
                    issueReservation.isPending ||
                    !["QUEUED", "NOTIFIED"].includes(item.status) ||
                    (item.status === "QUEUED" && Number(item.queue_position || 0) !== 1) ||
                    Number(item.user_debt_total || 0) > 0
                  }
                  onClick={() => {
                    setOpenMenuReservationId(null);
                    handleOpenIssueModal(item);
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF] disabled:opacity-40"
                >
                  {t("admin_reservations.actions.issue_book")}
                </button>
              </div>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
            {t("admin_reservations.title")}
          </h1>
          <p className="text-[#142B6F] font-medium">{t("admin_reservations.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            onClick={handleRefresh}
            className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2.5 bg-white border border-[#E1DEE5] rounded-xl text-sm font-bold text-[#111111]"
          >
            <RefreshCcw size={15} /> {t("admin_reservations.refresh")}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => void handleCancelReservations()}
              disabled={expireReservations.isPending}
              className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl animate-in fade-in slide-in-from-right-2 duration-300"
            >
              {expireReservations.isPending
                ? t("admin_reservations.cancelling")
                : t("admin_reservations.cancel_selected", { count: selectedIds.size })}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E1DEE5]/50 bg-[#FFFFFF]">
          <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            {t("admin_reservations.high_demand.title")}
          </h2>
          {highDemandLoading ? (
            <p className="text-xs text-[#142B6F] mt-2">{t("admin_reservations.high_demand.loading")}</p>
          ) : highDemand.length === 0 ? (
            <p className="text-xs text-[#142B6F] mt-2">{t("admin_reservations.high_demand.no_demand")}</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {highDemand.map((item) => (
                <div key={item.book.id} className="rounded-xl border border-[#E1DEE5] bg-white p-3">
                  <p className="text-sm font-bold text-[#111111] truncate">{item.book.title}</p>
                  <p className="text-xs text-[#142B6F] mt-1">
                    {t("admin_reservations.high_demand.queue")}: {item.queueCount} •{" "}
                    {t("admin_reservations.high_demand.copies")}: {item.book.copies} •{" "}
                    {t("admin_reservations.high_demand.available")}: {item.book.available}
                  </p>
                  <p className="text-xs text-[#142B6F] mt-1">
                    {t("admin_reservations.high_demand.pressure")}: {item.pressureRatio}
                  </p>
                  {item.needsInventoryAction ? (
                    <p className="text-[11px] font-bold text-red-700 mt-1">
                      {t("admin_reservations.high_demand.recommendation")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <TanStackTable
          data={reservations}
          columns={reservationColumns}
          isLoading={isLoading}
          emptyText="No reservations found"
          skeletonRows={6}
        />
      </div>

      {issueModalReservation ? (
        <div
          className="fixed inset-0 z-2147483647 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!issueReservation.isPending) {
              setIssueModalReservation(null);
              setIssueCopyCode("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E1DEE5] bg-white p-5 sm:p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-serif font-extrabold text-[#111111]">{t("admin_reservations.modal.title")}</h3>
            <p className="mt-1 text-sm text-[#142B6F]">{issueModalReservation.book.title}</p>

            <div className="mt-4">
              <label className="block text-sm font-bold text-[#111111] mb-1.5">
                {t("admin_reservations.modal.copy_code")}
              </label>
              <input
                type="text"
                value={issueCopyCode}
                onChange={(e) => setIssueCopyCode(e.target.value)}
                placeholder="BC-XXXXXXXX-0001"
                className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={issueReservation.isPending}
                onClick={() => {
                  setIssueModalReservation(null);
                  setIssueCopyCode("");
                }}
                className="px-4 py-2.5 rounded-xl border border-[#E1DEE5] text-sm font-bold text-[#142B6F] disabled:opacity-40"
              >
                {t("admin_reservations.modal.cancel")}
              </button>
              <button
                type="button"
                disabled={issueReservation.isPending || !issueCopyCode.trim()}
                onClick={() => void handleConfirmIssue()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#142B6F] disabled:opacity-40"
              >
                {issueReservation.isPending
                  ? t("admin_reservations.modal.issuing")
                  : t("admin_reservations.actions.issue_book")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
