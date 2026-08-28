"use client";

/**
 * DesktopNotificationBanner.tsx
 *
 * Non-intrusive banner shown to users who haven't granted desktop notification
 * permission yet. Appears once per portal session and gracefully handles:
 *   - "unsupported" (API not available) — renders nothing
 *   - "denied" — shows a muted dismissible hint to check browser settings
 *   - "default" (never asked) — shows a prompt with an "Enable" CTA
 *   - "granted" — renders nothing (no noise once enabled)
 *
 * Mount it near the top of both the admin and student dashboard layouts.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { useDesktopNotifications } from "@/lib/hooks/useDesktopNotifications";

type BannerVariant = "prompt" | "denied";

const DISMISSED_KEY = "brana_desktop_notif_dismissed";
const AUTO_DISMISS_MS = 7000; // Auto disappear after 7 seconds if not hovered

export function DesktopNotificationBanner() {
  const { permission, isSupported, requestPermission } = useDesktopNotifications();

  // Persisted dismiss — don't re-show if user already dismissed this session
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [requesting, setRequesting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Only reveal after mount to avoid SSR hydration mismatch
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(wasDismissed);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  // Auto-dismiss after 7s unless hovered or requesting permission
  useEffect(() => {
    if (dismissed || permission === "granted" || requesting || isHovered) {
      return;
    }

    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [dismissed, permission, requesting, isHovered, dismiss]);

  const handleEnable = useCallback(async () => {
    setRequesting(true);
    try {
      await requestPermission();
    } finally {
      setRequesting(false);
      // If granted, banner will auto-hide (permission becomes "granted")
      // If denied, show the denied hint
    }
  }, [requestPermission]);

  // Don't render if:
  if (!isSupported) return null;
  if (permission === "granted") return null;
  if (dismissed) return null;

  const variant: BannerVariant = permission === "denied" ? "denied" : "prompt";

  return (
    <AnimatePresence>
      <motion.div
        key="desktop-notif-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="status"
        aria-live="polite"
        className={`
          relative flex items-center gap-3 px-4 py-2.5 text-sm
          border-b
          ${
            variant === "prompt"
              ? "bg-[#142b6f]/[0.04] border-[#142b6f]/10 text-[#142b6f]"
              : "bg-[#f5f4f0] border-[#e2e0e7] text-[#6b7280]"
          }
        `}
      >
        {/* Icon */}
        <div
          className={`
            shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
            ${variant === "prompt" ? "bg-[#142b6f]/10" : "bg-[#e2e0e7]"}
          `}
        >
          {variant === "prompt" ? (
            <Bell size={13} className="text-[#142b6f]" strokeWidth={2} />
          ) : (
            <BellOff size={13} className="text-[#9ca3af]" strokeWidth={2} />
          )}
        </div>

        {/* Text */}
        <p className="flex-1 text-[12px] font-medium leading-snug">
          {variant === "prompt" ? (
            <>
              <span className="font-bold">Stay updated</span> — enable desktop
              notifications to get real-time alerts when you&apos;re on another tab.
            </>
          ) : (
            <>
              <span className="font-semibold">Desktop notifications are blocked.</span>{" "}
              To enable them, open your browser settings and allow notifications for this
              site.
            </>
          )}
        </p>

        {/* CTA */}
        {variant === "prompt" && (
          <button
            id="brana-enable-desktop-notif-btn"
            type="button"
            onClick={handleEnable}
            disabled={requesting}
            className="
              shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-[#142b6f] text-white text-[11px] font-bold
              hover:bg-[#1e3a8a] active:scale-95
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            <Bell size={11} strokeWidth={2.5} />
            {requesting ? "Requesting…" : "Enable"}
          </button>
        )}

        {/* Dismiss */}
        <button
          id="brana-dismiss-desktop-notif-banner"
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification banner"
          className="
            shrink-0 w-6 h-6 rounded-md flex items-center justify-center
            text-current opacity-40 hover:opacity-70
            transition-opacity
          "
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
