"use client";

import { usePersona } from "@/components/providers/PersonaProvider";
import { useCurrentUser, useMyRentals, useMyDebtSummary } from "@/lib/hooks/useQueries";
import { AlertTriangle, ShieldAlert, Ban, DollarSign, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentAccountStandingBanner() {
  const pathname = usePathname();
  const { user: personaUser } = usePersona();
  const { data: userData } = useCurrentUser();
  const { data: rentalsData } = useMyRentals("limit=50");
  const { data: debtData } = useMyDebtSummary();

  const user = (userData?.data?.user as any) || personaUser;

  if (!user) return null;

  const isStudent =
    user.role === "STUDENT" ||
    user.activePersona === "STUDENT" ||
    (Array.isArray(user.roles) && user.roles.includes("STUDENT")) ||
    (typeof pathname === "string" && pathname.startsWith("/dashboard/student"));

  if (!isStudent) return null;

  const standing = user.standing || "GOOD_STANDING";
  const isBlocked = Boolean(user.is_blocked);
  const trustScore = user.trust_score ?? 100;
  const standingNote = user.standing_note;

  // Calculate pending fines / damage debt
  const rentals = (rentalsData?.rentals || []) as any[];
  const pendingRentals = rentals.filter((r) => r.status === "PENDING" && Number(r.fine || 0) > 0);
  const calculatedFine = pendingRentals.reduce((sum, r) => sum + Number(r.fine || 0), 0);

  const apiDebt = (debtData as any)?.data?.totalDebt ?? (debtData as any)?.totalDebt;
  const pendingFineTotal = typeof apiDebt === "number" && apiDebt > 0 ? apiDebt : calculatedFine;

  const isSuspendedOrBlocked = isBlocked || standing === "SUSPENDED";
  const isRedFlag = standing === "RED_FLAG";
  const isYellowFlag = standing === "YELLOW_FLAG";

  // Hide banner only if account is in Good Standing AND has zero pending fine debt
  if (standing === "GOOD_STANDING" && !isBlocked && pendingFineTotal <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-40 overflow-hidden shadow-md"
      >
        <div className="space-y-0.5">
          {/* ── 1. SUSPENDED / BLOCKED BANNER (Vibrant Solid Red Theme) ── */}
          {isSuspendedOrBlocked && (
            <div className="bg-rose-600 text-white px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 border-b border-rose-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 border border-white/30 text-white">
                  <Ban className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-100">
                    ACCOUNT STANDING
                  </span>
                  <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-white text-rose-700 rounded-full shrink-0 shadow-xs">
                    SUSPENDED
                  </span>
                  <span className="hidden sm:inline text-white/40">•</span>
                  <span className="text-xs font-bold text-white/95 truncate">
                    Borrowing privileges disabled by library admin. {standingNote ? `"${standingNote}"` : ""}
                  </span>
                  <span className="hidden lg:inline text-xs text-rose-100/80 font-medium">
                    (Trust Score: {trustScore}/100)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/student/settings"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
                >
                  <span className="hidden sm:inline">Account Details</span>
                  <span className="sm:hidden">Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ── 2. RED FLAG BANNER (Vibrant Crimson-Orange Gradient Theme) ── */}
          {isRedFlag && !isSuspendedOrBlocked && (
            <div className="bg-gradient-to-r from-orange-600 via-rose-600 to-red-600 text-white px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 border-b border-rose-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 border border-white/30 text-white">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">
                    ACCOUNT STANDING
                  </span>
                  <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-white text-orange-700 rounded-full shrink-0 shadow-xs">
                    1 BOOK LIMIT
                  </span>
                  <span className="hidden sm:inline text-white/40">•</span>
                  <span className="text-xs font-bold text-white/95 truncate">
                    High-risk account status (Red Flag). Borrowing capped at 1 active book.
                  </span>
                  <span className="hidden lg:inline text-xs text-orange-100/80 font-medium">
                    (Trust Score: {trustScore}/100)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/student/settings"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-white hover:bg-orange-50 text-orange-800 text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
                >
                  <span className="hidden sm:inline">Account Details</span>
                  <span className="sm:hidden">Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ── 3. YELLOW FLAG BANNER (Vibrant Brana Gold Theme) ── */}
          {isYellowFlag && !isSuspendedOrBlocked && (
            <div className="bg-[#f5c518] text-[#0d0d0d] px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 border-b border-amber-400">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/10 border border-black/15 text-[#0d0d0d]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0d0d0d]/80">
                    ACCOUNT WARNING
                  </span>
                  <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-[#0d0d0d] text-[#f5c518] rounded-full shrink-0 shadow-xs">
                    1 BOOK LIMIT
                  </span>
                  <span className="hidden sm:inline text-black/30">•</span>
                  <span className="text-xs font-extrabold text-[#0d0d0d] truncate">
                    Return delay warning (Yellow Flag). Borrowing capped at 1 active book.
                  </span>
                  <span className="hidden lg:inline text-xs text-[#0d0d0d]/70 font-bold">
                    (Trust Score: {trustScore}/100)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/student/settings"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-[#0d0d0d] hover:bg-black/85 text-white text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
                >
                  <span className="hidden sm:inline">Account Details</span>
                  <span className="sm:hidden">Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ── 4. FINANCIAL STANDING BANNER (Vibrant Golden Amber Debt Theme) ── */}
          {pendingFineTotal > 0 && (
            <div className="bg-amber-500 text-amber-950 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 border-b border-amber-600">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-950/15 border border-amber-950/20 text-amber-950">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950/80">
                    FINANCIAL STANDING
                  </span>
                  <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-rose-600 text-white rounded-full shrink-0 shadow-xs">
                    {pendingFineTotal.toFixed(2)} ETB UNPAID
                  </span>
                  <span className="hidden sm:inline text-amber-950/30">•</span>
                  <span className="text-xs font-extrabold text-amber-950 truncate">
                    Unpaid damage penalties & overdue fines balance
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/student/payments"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-100 text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
                >
                  <span className="hidden sm:inline">Pay Fines Now</span>
                  <span className="sm:hidden">Pay Fines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
