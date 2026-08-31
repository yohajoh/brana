"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

const DISMISSED_KEY = "brana_admin_wishlist_banner_dismissed";

export function WishlistProcurementBanner() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [wishlistData, setWishlistData] = useState<{
    kpis?: { urgentProcurementCount: number; totalWishlists: number };
    procurementItems?: Array<{
      bookId: string;
      title: string;
      author: string;
      category: string;
      available: number | null;
      wishlistCount: number;
      reservationCount: number;
      decisionUrgency: string;
    }>;
  } | null>(null);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(isDismissed);

    fetchApi("/stats/wishlist-demand")
      .then((res) => setWishlistData(res.data))
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  if (dismissed) return null;

  const urgentItems =
    wishlistData?.procurementItems?.filter(
      (item) =>
        item.decisionUrgency === "URGENT_PURCHASE" ||
        item.decisionUrgency === "RESTOCK_NEEDED"
    ) || [];

  const urgentCount = wishlistData?.kpis?.urgentProcurementCount || 0;
  const totalWishlists = wishlistData?.kpis?.totalWishlists || 0;

  // If there are no wishlists or urgent items recorded yet, render nothing
  if (totalWishlists === 0 && urgentCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative z-40 overflow-hidden bg-[#0d0d0d] border-b border-[#2a2a2a] text-white shadow-lg transition-all duration-300 hover:border-[#f5c518]/40"
    >
      {/* Subtle gold glow background accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#f5c518]/10 blur-3xl" />

      {/* Main Single-Line Bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5c518]/15 border border-[#f5c518]/30">
            <Heart className="h-3.5 w-3.5 text-[#f5c518] fill-[#f5c518]/30" />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#f5c518]">
              Procurement Intelligence
            </span>
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 text-[9.5px] font-black bg-red-600 text-white rounded-full animate-pulse shrink-0">
                {urgentCount} Urgent Restocks
              </span>
            )}
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="text-xs font-bold text-white/90 truncate">
              Student Wishlist Demand Restock Recommendations
            </span>
            <span className="hidden lg:inline text-xs text-white/45">
              ({totalWishlists} item{totalWishlists === 1 ? "" : "s"} wishlisted)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/admin/wishlist-demand"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f5c518] hover:bg-[#e8a800] text-[#0d0d0d] text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
          >
            <span className="hidden sm:inline">Open Wishlist Demand Insights</span>
            <span className="sm:hidden">View Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss notification"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Urgent Restocks on Hover */}
      {urgentItems.length > 0 && (
        <div className="max-h-0 opacity-0 group-hover:max-h-60 group-hover:opacity-100 transition-all duration-300 ease-in-out border-t border-white/10 px-4 py-0 group-hover:py-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {urgentItems.slice(0, 3).map((item) => (
              <div
                key={item.bookId}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs transition-colors hover:bg-white/10"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold truncate text-white text-[11px]">{item.title}</p>
                  <p className="text-[10px] text-white/50">
                    {item.available === 0 ? "Out of Stock" : `${item.available} available`} • {item.wishlistCount} Wishlist(s)
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-red-600 text-white shrink-0">
                  {item.decisionUrgency === "URGENT_PURCHASE" ? "URGENT BUY" : "RESTOCK"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
