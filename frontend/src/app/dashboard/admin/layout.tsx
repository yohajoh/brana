import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarOffset } from "@/components/SidebarOffset";
import { AdminRouteGuard } from "@/components/guards/AdminRouteGuard";
import { DashboardShellProvider } from "@/components/providers/DashboardShellProvider";
import { DesktopNotificationBanner } from "@/components/notifications/DesktopNotificationBanner";
import { WishlistProcurementBanner } from "@/components/notifications/WishlistProcurementBanner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0d0d0d] flex selection:bg-[#f5c518]/30">
      <AdminRouteGuard />
      <DashboardShellProvider>
        <DashboardSidebar variant="admin" />
        <SidebarOffset>
          <Navbar />
          <main className="pt-14 flex-1 min-h-screen overflow-x-hidden">
            <DesktopNotificationBanner />
            <WishlistProcurementBanner />
            {children}
          </main>
        </SidebarOffset>
      </DashboardShellProvider>
    </div>
  );
}
