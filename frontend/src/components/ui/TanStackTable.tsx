"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useCallback } from "react";

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

/* ── Portal dropdown anchor ─────────────────────────────────────────────────
   Wraps the trigger button for a dropdown and renders the dropdown itself
   via a React portal so it always floats above every element on the page.
   Position is calculated from the trigger button's bounding rect.
───────────────────────────────────────────────────────────────────────────── */
export function PortalDropdown({
  trigger,
  children,
  isOpen,
  onClose,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, reposition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div ref={triggerRef} className="relative inline-flex">
      {trigger}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: pos.top,
              right: pos.right,
              zIndex: 2147483647,
            }}
          >
            <AnimatePresence>
              <motion.div
                key="portal-dropdown"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── TruncatedCell ────────────────────────────────────────────────────────────
   Shows truncated text. On click, expands to show full content in a
   portal tooltip. Auto-detects if content overflows.
───────────────────────────────────────────────────────────────────────────── */
export function TruncatedCell({ text, maxLength = 60 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLButtonElement>(null);
  const isLong = text && text.length > maxLength;

  const open = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 320),
      width: Math.min(320, window.innerWidth - 32),
    });
    setExpanded(true);
  };

  useEffect(() => {
    if (!expanded) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [expanded]);

  if (!isLong) {
    return <span className="text-[12px] text-[#0d0d0d]/70">{text || "—"}</span>;
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={(e) => { e.stopPropagation(); open(); }}
        className="text-left text-[12px] text-[#0d0d0d]/70 hover:text-[#0d0d0d] transition-colors group"
      >
        <span className="line-clamp-2">{text.slice(0, maxLength)}…</span>
        <span className="text-[10px] text-[#142b6f] font-semibold group-hover:underline ml-1">more</span>
      </button>
      {expanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 2147483647,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-xl border border-[#e8e4dc] shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[13px] text-[#0d0d0d] leading-relaxed">{text}</p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="mt-3 text-[11px] font-bold text-[#0d0d0d]/40 hover:text-[#0d0d0d] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ── Main TanStackTable ──────────────────────────────────────────────────── */
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
                    <span className="text-[9.5px] font-black text-[#0d0d0d]/35 uppercase tracking-[0.16em] whitespace-normal break-words">
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
                >
                  {row.getVisibleCells().map((cell, ci) => {
                    const meta = cell.column.columnDef.meta as TableColumnMeta | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={`
                          px-4 py-3.5 align-middle
                          ${ci === 0 ? "pl-5" : ""}
                          ${meta?.cellClassName ?? ""}
                        `}
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
