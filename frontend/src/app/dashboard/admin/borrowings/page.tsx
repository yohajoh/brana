"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useRentals, useProcessReturn } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";

type Rental = {
  id: string;
  status: string;
  loan_date: string;
  due_date: string;
  return_date?: string | null;
  fine?: number | null;
  user: { name: string; email: string; student_id?: string | null };
  physical_book: { title: string };
  isOverdue?: boolean;
  daysOverdue?: number;
};

const ITEMS_PER_PAGE = 10;

function BorrowingsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useLanguage();

  const statusFilter = searchParams.get("status") || "";
  const queryParams = new URLSearchParams();
  queryParams.set("limit", "200");
  if (statusFilter) queryParams.set("status", statusFilter);

  const { data: rentalsData, isLoading, refetch } = useRentals(queryParams.toString());
  const processReturn = useProcessReturn();
  const processingReturnId = processReturn.isPending ? processReturn.variables : undefined;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const rentals: Rental[] = (rentalsData?.rentals || []) as unknown as Rental[];

  const filtered = rentals.filter(
    (r) =>
      !search.trim() ||
      r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.physical_book?.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.status?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const columns: ColumnDef<Rental, unknown>[] = [
    {
      header: t("admin_borrowings.table.student"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#111111] truncate">{row.original.user?.name}</p>
          <p className="text-xs text-[#142B6F] truncate">{row.original.user?.email}</p>
        </div>
      ),
    },
    {
      header: t("admin_borrowings.table.book"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111] truncate block">{row.original.physical_book?.title}</span>
      ),
    },
    {
      header: t("admin_borrowings.table.loan_date"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{new Date(row.original.loan_date).toLocaleDateString()}</span>
      ),
    },
    {
      header: t("admin_borrowings.table.due_date"),
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{new Date(row.original.due_date).toLocaleDateString()}</span>
      ),
    },
    {
      header: t("admin_borrowings.table.status"),
      cell: ({ row }) => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#E1DEE5] text-[#111111] w-fit block">
          {row.original.status}
        </span>
      ),
    },
    {
      header: t("admin_borrowings.table.fine"),
      cell: ({ row }) => <span className="text-sm text-[#111111]/70">{Number(row.original.fine || 0).toFixed(2)}</span>,
    },
    {
      header: t("admin_borrowings.table.action"),
      cell: ({ row }) => (
        <button
          onClick={() => handleProcessReturn(row.original.id)}
          disabled={
            processingReturnId === row.original.id ||
            row.original.status === "RETURNED" ||
            row.original.status === "COMPLETED"
          }
          className="px-3 py-1.5 text-xs font-bold text-[#111111] border border-[#E1DEE5] rounded-lg hover:bg-[#E1DEE5]/20 disabled:opacity-40"
        >
          {processingReturnId === row.original.id
            ? t("admin_borrowings.actions.processing")
            : t("admin_borrowings.actions.return")}
        </button>
      ),
    },
  ];

  const handleProcessReturn = async (id: string) => {
    try {
      await processReturn.mutateAsync(id);
      toast.success(t("admin_borrowings.messages.return_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("admin_borrowings.messages.return_failed") || "Failed to process return"));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
            {t("admin_borrowings.title")}
          </h1>
          <p className="text-[#142B6F] font-medium">{t("admin_borrowings.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:mt-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
            <input
              type="text"
              placeholder={t("admin_borrowings.search_placeholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5]"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex w-full justify-center items-center gap-2 px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl sm:w-auto"
          >
            <RefreshCcw size={15} />
            {t("common.refresh") || "Refresh"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
        <TanStackTable
          data={paginated}
          columns={columns}
          isLoading={isLoading}
          skeletonRows={5}
          emptyText={t("admin_borrowings.table.no_borrowings")}
        />
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            {t("common.previous")}
          </button>
          <div className="flex w-full items-center justify-center gap-1.5 overflow-x-auto sm:w-auto sm:justify-start">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 shrink-0 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#142B6F] text-white" : "text-[#111111]/60 hover:bg-[#E1DEE5]"}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
          >
            {t("common.next")}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function BorrowingsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="h-12 w-64 bg-[#E1DEE5]/30 rounded-lg animate-pulse" />
          <div className="h-5 w-full max-w-md bg-[#E1DEE5]/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E1DEE5]/50 overflow-visible">
        <div className="py-8 px-6 space-y-3">
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
          <div className="h-10 rounded-xl bg-[#E1DEE5] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AdminBorrowingsPage() {
  return (
    <Suspense fallback={<BorrowingsLoading />}>
      <BorrowingsContent />
    </Suspense>
  );
}
