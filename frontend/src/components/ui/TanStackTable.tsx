"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";

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
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const formatHeaderFallback = (id: string) =>
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    /*
     * overflow-visible on the outer wrapper is critical:
     * it allows action dropdowns in the last rows to escape the table
     * container and render above/below without being clipped.
     * overflow-x-auto is only applied to the inner scroll layer so
     * horizontal scrolling still works on mobile.
     */
    <div className="w-full" style={{ overflowX: "auto", overflowY: "visible" }}>
      <table className="w-full min-w-[640px] border-collapse">

        {/* ── Header ─────────────────────────────────────────── */}
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-[#e8e4dc]">
              {hg.headers.map((header, i) => {
                const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
                const isAction = header.column.id === "action" || header.column.id === "actions";
                const rendered = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext());
                const label = (!isAction && (rendered == null || rendered === ""))
                  ? formatHeaderFallback(header.column.id)
                  : rendered;

                return (
                  <th
                    key={header.id}
                    className={`
                      px-4 py-3 text-left bg-[#faf9f6]
                      ${i === 0 ? "pl-5" : ""}
                      ${meta?.headerClassName ?? ""}
                    `}
                  >
                    <span className="text-[9.5px] font-black text-[#0d0d0d]/35 uppercase tracking-[0.16em]">
                      {label}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* ── Body ───────────────────────────────────────────── */}
        <tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-[#e8e4dc]/60">
                {columns.map((_, c) => (
                  <td key={`sk-${i}-${c}`} className={`px-4 py-3.5 ${c === 0 ? "pl-5" : ""}`}>
                    <div
                      className="h-3.5 rounded-full bg-[#e8e4dc]"
                      style={{
                        width: `${55 + ((i * 13 + c * 17) % 35)}%`,
                        animation: `shimmer 1.4s ease-in-out ${i * 80}ms infinite`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-14 text-center">
                <p className="text-sm text-[#0d0d0d]/35 font-medium">{emptyText}</p>
              </td>
            </tr>
          ) : (
            <AnimatePresence initial={false}>
              {table.getRowModel().rows.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: i * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`
                    border-b border-[#e8e4dc]/60 transition-colors duration-100
                    hover:bg-[#f5c518]/[0.04]
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${rowClassName}
                  `}
                  /* Each row gets position:relative so the action dropdown
                     cell can use position:absolute or the dropdown can escape
                     via a high z-index. */
                  style={{ position: "relative" }}
                >
                  {row.getVisibleCells().map((cell, ci) => {
                    const meta = cell.column.columnDef.meta as TableColumnMeta | undefined;
                    const isActionCol =
                      cell.column.id === "action" || cell.column.id === "actions";
                    return (
                      <td
                        key={cell.id}
                        className={`
                          px-4 py-3.5 align-middle
                          ${ci === 0 ? "pl-5" : ""}
                          ${isActionCol ? "overflow-visible" : ""}
                          ${meta?.cellClassName ?? ""}
                        `}
                        /* action cells must not clip their dropdowns */
                        style={isActionCol ? { overflow: "visible" } : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  );
}
