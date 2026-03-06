import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FDF9F0] flex">
      <Sidebar />
      <main className="flex-1 ml-72">{children}</main>
    </div>
  );
}
