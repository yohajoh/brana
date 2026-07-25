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
        {/* lg:ml-64 offsets the fixed sidebar; pr-0 ensures content reaches right edge symmetrically */}
        <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
          <Navbar />
          {/* pt-14 clears navbar; each page handles its own px padding uniformly */}
          <main className="pt-14 flex-1 min-h-screen overflow-x-hidden">
            {children}
          </main>
        </div>
      </DashboardShellProvider>
    </div>
  );
}
