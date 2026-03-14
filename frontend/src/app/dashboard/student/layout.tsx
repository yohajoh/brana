import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { StudentRouteGuard } from "@/components/guards/StudentRouteGuard";
import { DashboardShellProvider } from "@/components/providers/DashboardShellProvider";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen bg-[#FFFFFF] text-foreground flex selection:bg-primary/10">
      <StudentRouteGuard />
      <DashboardShellProvider>
        <DashboardSidebar />
        <div className="flex-1 lg:ml-64 pt-16">
          <Navbar />
          <main className="h-[calc(100dvh-64px)] overflow-y-auto bg-[#FFFFFF]">{children}</main>
        </div>
      </DashboardShellProvider>
    </div>
  );
}
