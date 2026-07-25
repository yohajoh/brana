import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { StudentRouteGuard } from "@/components/guards/StudentRouteGuard";
import { DashboardShellProvider } from "@/components/providers/DashboardShellProvider";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0d0d0d] flex selection:bg-[#f5c518]/30">
      <StudentRouteGuard />
      <DashboardShellProvider>
        <DashboardSidebar />
        <div className="flex-1 lg:ml-72 min-w-0 flex flex-col">
          <Navbar />
          <main className="pt-14 flex-1">
            {children}
          </main>
        </div>
      </DashboardShellProvider>
    </div>
  );
}
