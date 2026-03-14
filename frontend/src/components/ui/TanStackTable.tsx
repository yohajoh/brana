"use client";

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

type TanStackTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  rowClassName?: string;
  onRowClick?: (rowData: TData) => void;
};

type TableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

export function TanStackTable<TData>({
  data,
  columns,
  isLoading = false,
  skeletonRows = 5,
  emptyText = "No data",
  rowClassName = "",
  onRowClick,
}: TanStackTableProps<TData>) {
  const formatHeaderFallback = (columnId: string) =>
    columnId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#E1DEE5]/50 bg-white">
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <table className="w-full min-w-[800px] border-separate border-spacing-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const renderedHeader = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());
                  const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
                  const isActionColumn = header.column.id === "action" || header.column.id === "actions";
                  const shouldFallback =
                    !isActionColumn &&
                    (renderedHeader == null || (typeof renderedHeader === "string" && renderedHeader.trim() === ""));

                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#142B6F] border-b border-[#E1DEE5]/60 bg-[#FFFFFF] ${meta?.headerClassName || ""}`}
                    >
                      {shouldFallback ? formatHeaderFallback(header.column.id) : renderedHeader}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((_, c) => (
                    <td key={`sk-${i}-${c}`} className="px-4 py-4 border-b border-[#E1DEE5]/40">
                      <div className="h-4 w-full rounded-md bg-[#E1DEE5]/70 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[#142B6F]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#E1DEE5]/40 hover:bg-[#FFFFFF] ${rowClassName}`}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as TableColumnMeta | undefined;

                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-4 align-middle text-sm text-[#111111] ${meta?.cellClassName || ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
