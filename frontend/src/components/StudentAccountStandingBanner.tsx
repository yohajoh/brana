"use client";

import { usePersona } from "@/components/providers/PersonaProvider";
import { useMyRentals } from "@/lib/hooks/useQueries";
import { AlertTriangle, ShieldAlert, Ban, DollarSign, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function StudentAccountStandingBanner() {
  const { user } = usePersona();
  const { data: rentalsData } = useMyRentals();

  if (!user || user.role !== "STUDENT") return null;

  const standing = user.standing || "GOOD_STANDING";
  const isBlocked = Boolean(user.is_blocked);
  const trustScore = user.trust_score ?? 100;
  const standingNote = user.standing_note;

  // Calculate pending fines / damage debt
  const rentals = (rentalsData?.rentals || []) as any[];
  const pendingRentals = rentals.filter((r) => r.status === "PENDING" && Number(r.fine || 0) > 0);
  const pendingFineTotal = pendingRentals.reduce((sum, r) => sum + Number(r.fine || 0), 0);

  const isSuspendedOrBlocked = isBlocked || standing === "SUSPENDED";
  const isRedFlag = standing === "RED_FLAG";
  const isYellowFlag = standing === "YELLOW_FLAG";

  // Hide if good standing AND no unpaid fines
  if (standing === "GOOD_STANDING" && !isBlocked && pendingFineTotal === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full space-y-1"
      >
        {isSuspendedOrBlocked ? (
          <div className="bg-rose-600 text-white px-5 py-3 flex items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <Ban className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider">Account Borrowing Suspended</p>
                <p className="opacity-90 font-medium mt-0.5">
                  Your borrowing privileges have been temporarily suspended by library administration.
                  {standingNote && <span className="italic block mt-0.5">"{standingNote}"</span>}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-mono font-bold block sm:inline">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : isRedFlag ? (
          <div className="bg-gradient-to-r from-orange-600 to-rose-700 text-white px-5 py-3 flex items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider">High Risk Account Status (Red Flag — 1 Book Limit)</p>
                <p className="opacity-95 font-medium mt-0.5">
                  Your account is flagged for damage or repeat delay. Borrowing cap is reduced to <strong>1 active book loan max</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-mono font-bold block sm:inline">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : isYellowFlag ? (
          <div className="bg-amber-500 text-amber-950 px-5 py-2.5 flex items-start sm:items-center justify-between gap-3 border-b border-amber-600/30">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-600/20 rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-950" />
              </div>
              <div className="text-xs">
                <p className="font-black uppercase tracking-wider">Account Warning (Yellow Flag — 1 Book Limit)</p>
                <p className="font-medium opacity-90">
                  Your account has return delay warnings. Your borrowing limit is temporarily capped at <strong>1 active book</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-amber-600/20 text-[10px] font-mono font-black block sm:inline">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : null}

        {/* Unpaid fines alert bar */}
        {pendingFineTotal > 0 && (
          <div className="bg-amber-900 text-amber-100 px-5 py-2.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-amber-700/50 rounded shrink-0">
                <DollarSign className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-xs">
                <p className="font-bold">
                  Outstanding Debt: <span className="text-amber-300 font-extrabold">{pendingFineTotal.toFixed(2)} ETB</span> across {pendingRentals.length} rental penalty record{pendingRentals.length > 1 ? "s" : ""}
                </p>
                <p className="text-[11px] opacity-80">
                  Please settle your unpaid fines to ensure uninterrupted borrowing privileges.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/student/payments"
              className="flex items-center gap-1 bg-amber-400 text-amber-950 hover:bg-amber-300 px-3 py-1 rounded-lg text-[11px] font-extrabold shrink-0 transition-colors"
            >
              Pay Fines <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
