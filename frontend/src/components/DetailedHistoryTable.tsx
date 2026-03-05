"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const detailedHistory = [
  {
    id: 1,
    title: "የብርሃን እናት",
    borrowedDate: "Jan 10, 2026",
    returnedDate: "---",
    daysKept: "---",
    amountPaid: "---",
    status: "Currently Borrowed",
  },
  {
    id: 2,
    title: "የንስሐ እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 3,
    title: "የበረከት እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 4,
    title: "የጽናት እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 5,
    title: "የክብር እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 6,
    title: "የወንጌል እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 7,
    title: "የተስፋ እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 8,
    title: "የፍቅር እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 9,
    title: "የሰላም እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 10,
    title: "የደስታ እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 11,
    title: "የጥበብ እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Jan 24, 2026",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
  {
    id: 12,
    title: "የሕይወት እናት",
    borrowedDate: "Dec 1, 2025",
    returnedDate: "Dec 12, 2025",
    daysKept: "11 days",
    amountPaid: "22 birr",
    status: "Returned",
  },
];

export const DetailedHistoryTable = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif font-extrabold text-primary">
          Borrowing History
        </h3>
        <button className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition-colors group">
          See all
          <ChevronRight
            size={16}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/50 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Title
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Borrowed Date
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Returned Date
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Days Kept
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Amount Paid
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60">
                Status
              </th>
              <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-extrabold text-secondary/60 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border/20">
            {detailedHistory.map((row) => (
              <tr key={row.id} className="hover:bg-primary/2 transition-colors">
                <td className="px-6 py-5 font-bold text-primary">
                  {row.title}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.borrowedDate}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.returnedDate}
                </td>
                <td className="px-6 py-5 text-secondary font-medium">
                  {row.daysKept}
                </td>
                <td className="px-6 py-5 font-extrabold text-primary">
                  {row.amountPaid}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      row.status === "Currently Borrowed"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link
                    href={`/books/${row.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border bg-card text-[11px] font-bold text-secondary hover:text-primary hover:border-primary transition-all whitespace-nowrap"
                  >
                    See Book Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
