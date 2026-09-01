import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarOffset } from "@/components/SidebarOffset";
import { StudentRouteGuard } from "@/components/guards/StudentRouteGuard";
import { DashboardShellProvider } from "@/components/providers/DashboardShellProvider";
import { DesktopNotificationBanner } from "@/components/notifications/DesktopNotificationBanner";
import { StudentAccountStandingBanner } from "@/components/StudentAccountStandingBanner";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0d0d0d] flex selection:bg-[#f5c518]/30">
      <StudentRouteGuard />
      <DashboardShellProvider>
        <DashboardSidebar />
        <SidebarOffset>
          <Navbar />
          <main className="pt-14 flex-1 min-h-screen overflow-x-hidden">
            <StudentAccountStandingBanner />
            <DesktopNotificationBanner />
            {children}
          </main>
        </SidebarOffset>
      </DashboardShellProvider>
    </div>
  );
}
