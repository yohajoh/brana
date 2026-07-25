"use client";
"use client";

/**
 * SidebarOffset
 * Animates the left margin of the main content area to match
 * the sidebar's expanded (256px) or collapsed (64px) width.
 * On mobile the sidebar is an overlay drawer so no margin is applied.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useDashboardShell();

  // Detect desktop (≥ 1024px) — only offset on desktop
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const targetMargin = isDesktop ? (isCollapsed ? 64 : 256) : 0;

  return (
    <motion.div
      animate={{ marginLeft: targetMargin }}
      transition={{ type: "spring", stiffness: 360, damping: 36 }}
      className="flex-1 min-w-0 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
