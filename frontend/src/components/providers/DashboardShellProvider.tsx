"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type DashboardShellContextValue = {
  isMobileSidebarOpen: boolean;
  isCollapsed: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
  toggleCollapsed: () => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function DashboardShellProvider({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileSidebarOpen]);

  const value = useMemo<DashboardShellContextValue>(
    () => ({
      isMobileSidebarOpen,
      isCollapsed,
      openMobileSidebar:   () => setIsMobileSidebarOpen(true),
      closeMobileSidebar:  () => setIsMobileSidebarOpen(false),
      toggleMobileSidebar: () => setIsMobileSidebarOpen((v) => !v),
      toggleCollapsed:     () => setIsCollapsed((v) => !v),
    }),
    [isMobileSidebarOpen, isCollapsed],
  );

  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const ctx = useContext(DashboardShellContext);
  return ctx ?? {
    isMobileSidebarOpen: false,
    isCollapsed: false,
    openMobileSidebar:   () => {},
    closeMobileSidebar:  () => {},
    toggleMobileSidebar: () => {},
    toggleCollapsed:     () => {},
  };
}
