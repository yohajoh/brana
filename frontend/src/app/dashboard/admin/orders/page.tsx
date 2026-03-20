"use client";

import { Suspense, useMemo, useState } from "react";
import { Search, RefreshCcw } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDeliveryOrders, type DeliveryOrder } from "@/lib/hooks/useQueries";
import { TanStackTable } from "@/components/ui/TanStackTable";

function AdminOrdersContent() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useDeliveryOrders();

  const orders = useMemo(() => (data?.orders || []) as DeliveryOrder[], [data?.orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const fields = [
        order.user?.name,
        order.user?.email,
        order.user?.student_id,
        order.user?.year,
        order.rental?.physical_book?.title,
        order.building_block_number,
        order.dorm_number,
        order.available_time,
        order.rental?.status,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(q));
    });
  }, [orders, search]);

  const columns: ColumnDef<DeliveryOrder, unknown>[] = [
    {
      header: "Student",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#111111]">{row.original.user?.name || "-"}</p>
          <p className="truncate text-xs text-[#142B6F]">{row.original.user?.email || "-"}</p>
        </div>
      ),
    },
    {
      header: "Year",
      cell: ({ row }) => <span className="text-sm text-[#111111]/80">{row.original.user?.year || "-"}</span>,
    },
    {
      header: "Book",
      cell: ({ row }) => (
        <span className="block truncate text-sm text-[#111111]">
          {row.original.rental?.physical_book?.title || "-"}
        </span>
      ),
    },
    {
      header: "Building",
      cell: ({ row }) => <span className="text-sm text-[#111111]/80">{row.original.building_block_number}</span>,
    },
    {
      header: "Dorm",
      cell: ({ row }) => <span className="text-sm text-[#111111]/80">{row.original.dorm_number}</span>,
    },
    {
      header: "Available Time",
      cell: ({ row }) => <span className="text-sm text-[#111111]/80">{row.original.available_time}</span>,
    },
    {
      header: "Payment",
      cell: ({ row }) => {
        const paymentStatus = row.original.rental?.payment?.status || "UNKNOWN";
        const color = paymentStatus === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-[#E1DEE5] text-[#111111]";
        return (
          <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${color}`}>{paymentStatus}</span>
        );
      },
    },
    {
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70">{new Date(row.original.created_at).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-extrabold text-[#111111] sm:text-4xl lg:text-5xl">Orders</h1>
          <p className="font-medium text-[#142B6F]">Delivery requests created after successful borrow payments.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:mt-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, year, book, building..."
              className="w-full rounded-xl border border-[#E1DEE5] bg-white py-2.5 pl-9 pr-4 text-sm text-[#111111] placeholder:text-[#111111]/40 sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B6F] px-4 py-2.5 text-sm font-bold text-white sm:w-auto"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-visible rounded-2xl border border-[#E1DEE5]/50 bg-white">
        <TanStackTable
          data={filtered}
          columns={columns}
          isLoading={isLoading}
          skeletonRows={6}
          emptyText="No delivery orders found yet."
        />
      </div>
    </div>
  );
}

function AdminOrdersLoading() {
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-12">
      <div className="space-y-1">
        <div className="h-12 w-56 animate-pulse rounded-lg bg-[#E1DEE5]/30" />
        <div className="h-5 w-full max-w-md animate-pulse rounded-lg bg-[#E1DEE5]/30" />
      </div>
      <div className="overflow-visible rounded-2xl border border-[#E1DEE5]/50 bg-white">
        <div className="space-y-3 px-6 py-8">
          <div className="h-10 animate-pulse rounded-xl bg-[#E1DEE5]" />
          <div className="h-10 animate-pulse rounded-xl bg-[#E1DEE5]" />
          <div className="h-10 animate-pulse rounded-xl bg-[#E1DEE5]" />
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminOrdersLoading />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
