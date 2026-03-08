"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

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
  const [rows, setRows] = useState<OverdueRental[]>([]);
  const [ranking, setRanking] = useState<OverdueRank[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overdueRes, rankingRes] = await Promise.all([
        fetchApi("/rentals/admin/overdue?limit=200"),
        fetchApi("/rentals/admin/overdue-ranking?limit=10"),
      ]);
      setRows(overdueRes?.rentals || []);
      setRanking(rankingRes?.ranking || []);
    } finally {
      setLoading(false);
    }
  };

  const sendReminders = async () => {
    await fetchApi("/rentals/admin/send-reminders", { method: "POST" });
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const maxDays = Math.max(1, ...ranking.map((r) => r.totalDaysOverdue));

  return (
    <div className="p-6 lg:p-12 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Overdue Dashboard</h1>
          <p className="text-[#AE9E85] font-medium">Track overdue records, ranking, and fine exposure.</p>
        </div>
        <button onClick={sendReminders} className="px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl">
          Send Reminders
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#2B1A10]">Overdue Ranking (Escalation Priority)</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-[#AE9E85]">No ranking data.</p>
        ) : (
          ranking.map((item, idx) => (
            <div key={item.user.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2B1A10]">#{idx + 1} {item.user.name}</span>
                <span className="text-[#8B6B4A]">{item.totalDaysOverdue} days • {item.totalEstimatedFine.toFixed(2)} ETB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F3EFE6] overflow-hidden">
                <div className="h-full bg-[#8B6B4A]" style={{ width: `${(item.totalDaysOverdue / maxDays) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6] text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
          <span>Student</span>
          <span>Book</span>
          <span>Due Date</span>
          <span>Days Overdue</span>
          <span>Estimated Fine</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-[#AE9E85] text-sm">No overdue rentals</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 last:border-0">
              <div>
                <p className="text-sm font-bold text-[#2B1A10]">{item.user.name}</p>
                <p className="text-xs text-[#AE9E85]">{item.user.email}</p>
              </div>
              <span className="text-sm text-[#2B1A10]">{item.physical_book.title}</span>
              <span className="text-sm text-[#2B1A10]/70">{new Date(item.due_date).toLocaleDateString()}</span>
              <span className="text-sm font-bold text-red-700">{item.daysOverdue}</span>
              <span className="text-sm text-[#2B1A10]/70">{Number(item.estimatedFine).toFixed(2)} ETB</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
