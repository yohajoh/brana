"use client";

import React from "react";
import { BookOpen, Wallet, Calculator, Calendar } from "lucide-react";

export const HistorySummary = () => {
  const stats = [
    {
      label: "Total Books Borrowed",
      value: "12",
      icon: <BookOpen className="text-secondary" size={24} />,
    },
    {
      label: "Total Amount Paid",
      value: "312 birr",
      icon: <Wallet className="text-secondary" size={24} />,
    },
    {
      label: "Average Cost Per Book",
      value: "26 birr",
      icon: <Calculator className="text-secondary" size={24} />,
    },
    {
      label: "Total Days of Reading",
      value: "156 days",
      icon: <Calendar className="text-secondary" size={24} />,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-extrabold text-primary">
        Summary Stats
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted/50 rounded-lg">{stat.icon}</div>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                {stat.label}
              </p>
            </div>
            <p className="text-3xl font-serif font-extrabold text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
