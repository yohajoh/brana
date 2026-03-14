"use client";

import { useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/hooks/useQueries";
import { ColumnDef } from "@tanstack/react-table";
import { TanStackTable } from "@/components/ui/TanStackTable";

interface Category {
  id: string;
  name: string;
  _count?: { books: number; digital_books: number };
}

const ITEMS_PER_PAGE = 8;

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [openMenuCategoryId, setOpenMenuCategoryId] = useState<string | null>(null);
  const [deleteCategoryCandidate, setDeleteCategoryCandidate] = useState<{ id: string; name: string } | null>(null);

  const { data: categoriesData, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const deletingCategoryId = deleteCategory.isPending ? deleteCategory.variables : undefined;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const categories: Category[] = categoriesData?.categories || [];

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, data: { name: name.trim() } });
        toast.success("Category updated successfully");
      } else {
        await createCategory.mutateAsync({ name: name.trim() });
        toast.success("Category created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setName("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save category"));
    }
  };

  const handleDelete = async (candidate: { id: string; name: string }) => {
    try {
      await deleteCategory.mutateAsync(candidate.id);
      toast.success("Category deleted successfully");
      setDeleteCategoryCandidate(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete category"));
    }
  };

  const categoryColumns: ColumnDef<Category, unknown>[] = [
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-sm font-bold text-[#111111]">{row.original.name}</span>,
    },
    {
      id: "physical",
      header: "Physical",
      meta: {
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      cell: ({ row }) => <span className="text-sm text-[#111111]/70 block">{row.original._count?.books || 0}</span>,
    },
    {
      id: "digital",
      header: "Digital",
      meta: {
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      cell: ({ row }) => (
        <span className="text-sm text-[#111111]/70 block">{row.original._count?.digital_books || 0}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      meta: {
        headerClassName: "text-left w-[88px]",
        cellClassName: "text-left w-[88px]",
      },
      cell: ({ row }) => {
        const category = row.original;
        return (
          <div className="relative flex justify-start" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenMenuCategoryId((current) => (current === category.id ? null : category.id))}
              className="h-9 w-9 rounded-full border border-[#E1DEE5] bg-[#FFFFFF] text-[#142B6F] flex items-center justify-center"
              aria-label={`Open actions for ${category.name}`}
            >
              <MoreHorizontal size={16} />
            </button>

            {openMenuCategoryId === category.id ? (
              <div className="absolute right-0 top-11 z-2147483646 min-w-48 overflow-hidden sm:left-0 sm:right-auto sm:min-w-56 rounded-xl border border-[#E1DEE5] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuCategoryId(null);
                    openEdit(category);
                  }}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-[#111111] hover:bg-[#FFFFFF]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuCategoryId(null);
                    setDeleteCategoryCandidate({ id: category.id, name: category.name });
                  }}
                  disabled={deletingCategoryId === category.id}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-12 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-[#111111]">
              Manage Categories
            </h1>
            <p className="text-[#142B6F] font-medium">Create, edit and remove categories used by books.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:mt-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#142B6F]" />
              <input
                type="text"
                placeholder="Search category"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-52 pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1DEE5] rounded-xl text-[#111111] placeholder:text-[#E1DEE5]"
              />
            </div>
            <button
              onClick={openCreate}
              className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2.5 bg-[#142B6F] text-white text-sm font-bold rounded-xl"
            >
              <Plus size={16} />
              Add new category
            </button>
          </div>
        </div>

        <TanStackTable
          data={paginated}
          columns={categoryColumns}
          isLoading={isLoading}
          emptyText="No categories found"
          skeletonRows={4}
        />

        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <div className="flex w-full items-center justify-center gap-1.5 overflow-x-auto sm:w-auto sm:justify-start">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 shrink-0 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#142B6F] text-white" : "text-[#111111]/60 hover:bg-[#E1DEE5]"}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#111111]/60 disabled:opacity-30"
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
            <div className="flex items-center justify-between px-5 sm:px-8 pt-6 sm:pt-7 pb-4 border-b border-[#E1DEE5]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#111111]">
                {editingId ? "Edit Category" : "Add Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                title="Close"
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center text-[#142B6F] hover:text-[#111111] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-5 sm:px-8 py-5 sm:py-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#111111] mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1DEE5] rounded-xl text-[#111111]"
                  placeholder="Enter category name"
                />
              </div>
              <button
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending}
                className="w-full py-3 bg-[#142B6F] text-white text-sm font-bold rounded-xl disabled:opacity-50"
              >
                {createCategory.isPending || updateCategory.isPending
                  ? "Saving..."
                  : editingId
                    ? "Update Category"
                    : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteCategoryCandidate && (
        <div
          className="fixed inset-0 z-10000 bg-[#142B6F]/35 flex items-center justify-center p-4"
          onClick={() => !deleteCategory.isPending && setDeleteCategoryCandidate(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[28px] border border-[#E1DEE5] bg-[#FFFFFF] p-5 sm:p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-black text-[#111111]">Delete Category?</h3>
              <p className="text-sm text-[#142B6F] leading-6">
                This will remove <span className="font-bold text-[#111111]">{deleteCategoryCandidate.name}</span> if no
                linked books depend on it.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteCategoryCandidate(null)}
                disabled={deleteCategory.isPending}
                className="px-4 py-2.5 rounded-xl border border-[#E1DEE5] text-sm font-bold text-[#142B6F] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteCategoryCandidate)}
                disabled={deleteCategory.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 disabled:opacity-40"
              >
                {deleteCategory.isPending ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
