"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type DashboardShellContextValue = {
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function DashboardShellProvider({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Keep body from scrolling behind the mobile drawer.
    document.body.style.overflow = isMobileSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  const value = useMemo<DashboardShellContextValue>(
    () => ({
      isMobileSidebarOpen,
      openMobileSidebar: () => setIsMobileSidebarOpen(true),
      closeMobileSidebar: () => setIsMobileSidebarOpen(false),
      toggleMobileSidebar: () => setIsMobileSidebarOpen((current) => !current),
    }),
    [isMobileSidebarOpen],
  );

  return <DashboardShellContext.Provider value={value}>{children}</DashboardShellContext.Provider>;
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);
  return (
    context || {
      isMobileSidebarOpen: false,
      openMobileSidebar: () => {},
      closeMobileSidebar: () => {},
      toggleMobileSidebar: () => {},
    }
  );
}
