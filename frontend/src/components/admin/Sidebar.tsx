"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  BookOpen,
  PenTool,
  ArrowLeftRight,
  LogOut,
  ChevronRight,
  Book,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutGrid },
  { name: "Users", href: "/dashboard/admin/users", icon: Users },
  { name: "Books", href: "/dashboard/admin/books", icon: BookOpen },
  { name: "Authors", href: "/dashboard/admin/authors", icon: PenTool },
  {
    name: "Borrowings",
    href: "/dashboard/admin/borrowings",
    icon: ArrowLeftRight,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-72 h-screen bg-[#FDF8F0] border-r border-[#E1D2BD]/50 flex flex-col px-6 py-10 fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-10">
        <Book size={24} className="text-[#3B2718]" strokeWidth={1.5} />
        <span className="text-xl font-serif font-black text-[#3B2718] tracking-tight">
          Birana
        </span>
      </div>

      {/* Navigation */}
      <nav className="grow space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                isActive
                  ? "bg-[#C2B199] text-[#2B1A10] font-bold shadow-sm"
                  : "text-[#2B1A10]/60 hover:bg-[#F3EFE6] hover:text-[#2B1A10]"
              }`}
            >
              <item.icon
                size={20}
                strokeWidth={1.5}
                className={
                  isActive
                    ? "text-[#2B1A10]"
                    : "text-[#2B1A10]/50 group-hover:text-[#2B1A10]"
                }
              />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="mt-auto pt-8 border-t border-[#E1D2BD]/50 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#E1D2BD] flex items-center justify-center text-[#3B2718] font-bold text-sm">
            AU
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-bold text-[#3B2718] truncate">
              Anonymous User
            </p>
            <p className="text-[11px] text-[#AE9E85] truncate">
              anonymous@gamil.com
            </p>
          </div>
        </div>

        <button className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-[#2B1A10]/60 hover:text-red-500 hover:bg-red-50 transition-all group">
          <LogOut
            size={20}
            strokeWidth={1.5}
            className="group-hover:text-red-500"
          />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
