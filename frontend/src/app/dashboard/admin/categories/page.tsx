"use client";

import { useEffect, useState } from "react";
import { Trash2, Pencil, Search, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  _count?: {
    books: number;
    digital_books: number;
  };
}

const ITEMS_PER_PAGE = 8;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/categories?limit=200", {
        credentials: "include",
      });
      const data = await res.json();
      if (data?.status === "success" && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Fetch categories failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = JSON.stringify({ name: name.trim() });
      if (editingId) {
        const res = await fetch(`http://localhost:5000/api/categories/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update category");
        const updated = data?.data?.category as Category | undefined;
        if (updated) {
          setCategories((prev) =>
            prev
              .map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } else {
        const res = await fetch("http://localhost:5000/api/categories", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create category");
        const created = data?.data?.category as Category | undefined;
        if (created) {
          setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setShowModal(false);
      setEditingId(null);
      setName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Category action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? It can only be deleted when no books are assigned.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">Manage Categories</h1>
            <p className="text-[#AE9E85] font-medium">Create, edit and remove categories used by books.</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]" />
              <input
                type="text"
                placeholder="Search category"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] w-52 transition-all"
              />
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3d2413] transition-all whitespace-nowrap"
            >
              <Plus size={16} />
              Add new category
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[3fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">Category</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider text-center">Physical</span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider text-center">Digital</span>
                <span className="w-16" />
              </div>
              {paginated.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#AE9E85]">No categories found</div>
              ) : (
                paginated.map((category) => (
                  <div
                    key={category.id}
                    className="grid grid-cols-[3fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors last:border-0"
                  >
                    <span className="text-sm font-bold text-[#2B1A10]">{category.name}</span>
                    <span className="text-sm text-[#2B1A10]/70 text-center">{category._count?.books || 0}</span>
                    <span className="text-sm text-[#2B1A10]/70 text-center">{category._count?.digital_books || 0}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(category)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6] transition-all"
                      >
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

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
                    page === currentPage ? "bg-[#2B1A10] text-white" : "text-[#2B1A10]/60 hover:bg-[#F3EFE6]"
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

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">
                {editingId ? "Edit Category" : "Add Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg hover:bg-[#F3EFE6] transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  placeholder="Enter category name"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3d2413] transition-all disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
