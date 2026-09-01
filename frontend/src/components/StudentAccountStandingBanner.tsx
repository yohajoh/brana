"use client";

import { usePersona } from "@/components/providers/PersonaProvider";
import { AlertTriangle, ShieldAlert, Ban, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function StudentAccountStandingBanner() {
  const { user } = usePersona();

  if (!user) return null;

  const standing = user.standing || "GOOD_STANDING";
  const isBlocked = Boolean(user.is_blocked);
  const trustScore = user.trust_score ?? 100;
  const standingNote = user.standing_note;

  if (standing === "GOOD_STANDING" && !isBlocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full"
      >
        {isBlocked || standing === "SUSPENDED" ? (
          <div className="bg-rose-600 text-white px-5 py-3 flex items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <Ban className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider">Account Borrowing Suspended</p>
                <p className="opacity-90 font-medium mt-0.5">
                  Your borrowing privileges have been temporarily suspended by library administration due to unresolved damage liabilities or policy violations.
                  {standingNote && <span className="italic block mt-0.5">"{standingNote}"</span>}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-mono font-bold">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : standing === "RED_FLAG" ? (
          <div className="bg-gradient-to-r from-orange-600 to-rose-700 text-white px-5 py-3 flex items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider">High Risk Account Status (Red Flag)</p>
                <p className="opacity-95 font-medium mt-0.5">
                  Your account is flagged for physical book damage or repeat overdue returns. Borrowing is restricted to <strong>1 active book loan</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-mono font-bold">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : standing === "YELLOW_FLAG" ? (
          <div className="bg-amber-500 text-amber-950 px-5 py-2.5 flex items-start sm:items-center justify-between gap-3 border-b border-amber-600/30">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-600/20 rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-950" />
              </div>
              <div className="text-xs">
                <p className="font-black uppercase tracking-wider">Account Warning (Yellow Flag)</p>
                <p className="font-medium opacity-90">
                  Your account has return delay warnings. Maintain on-time returns to protect your borrowing privileges and trust score.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-amber-600/20 text-[10px] font-mono font-black">
                Trust Score: {trustScore}/100
              </span>
            </div>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
