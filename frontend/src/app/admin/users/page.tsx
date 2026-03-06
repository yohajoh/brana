"use client";

import { useEffect, useState } from "react";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  student_id?: string;
  year?: number;
  phone?: string;
  is_blocked?: boolean;
}

const ITEMS_PER_PAGE = 8;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/auth/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && Array.isArray(data.data?.users)) {
          setUsers(data.data.users);
        } else if (Array.isArray(data.users)) {
          setUsers(data.users);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.student_id?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">
            Manage Users
          </h1>
          <p className="text-[#AE9E85] font-medium">
            Filter, sort, and access detailed user profiles
          </p>
        </div>
        {/* Search */}
        <div className="relative mt-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]"
          />
          <input
            type="text"
            placeholder="Search user"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] w-56 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_auto_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                Name
              </span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                Email
              </span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                ID No
              </span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                Year
              </span>
              <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                Phone No
              </span>
              <span className="w-8"></span>
              <span className="w-28"></span>
            </div>

            {/* Table Rows */}
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#AE9E85]">
                <p className="text-sm font-medium">No users found</p>
              </div>
            ) : (
              paginated.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[2fr_2fr_1.5fr_0.8fr_1.2fr_auto_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors last:border-0"
                >
                  <span className="text-sm font-bold text-[#2B1A10] truncate">
                    {user.name}
                  </span>
                  <span className="text-sm text-[#8B6B4A] truncate">
                    {user.email}
                  </span>
                  <span className="text-sm text-[#2B1A10]/70">
                    {user.student_id || "—"}
                  </span>
                  <span className="text-sm text-[#2B1A10]/70">
                    {user.year || "—"}
                  </span>
                  <span className="text-sm text-[#2B1A10]/70">
                    {user.phone || "—"}
                  </span>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={deletingId === user.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                    title="Delete user"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                  <button className="w-28 px-3 py-1.5 text-xs font-bold text-[#2B1A10] border border-[#C2B199] rounded-lg hover:bg-[#C2B199]/20 transition-all whitespace-nowrap">
                    borrow history
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 hover:text-[#2B1A10] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                  page === currentPage
                    ? "bg-[#2B1A10] text-white"
                    : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#2B1A10]/60 hover:text-[#2B1A10] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
