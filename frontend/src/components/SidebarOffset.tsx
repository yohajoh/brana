"use client";

import { useEffect, useState } from "react";
import { useDashboardShell } from "@/components/providers/DashboardShellProvider";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const { isCollapsed }        = useDashboardShell();
  const [mounted, setMounted]  = useState(false);
  const [isLg, setIsLg]        = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq      = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const ml = mounted && isLg ? (isCollapsed ? 64 : 256) : 0;

  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{
        marginLeft:  ml,
        transition:  mounted ? "margin-left 0.35s cubic-bezier(0.16,1,0.3,1)" : "none",
      }}
    >
      {children}
    </div>
  );
}
