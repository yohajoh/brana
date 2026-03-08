"use client";

import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Pencil,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

type Tab = "all" | "physical" | "digital" | "categories";

interface Book {
  id: string;
  title: string;
  author?: { name: string };
  category?: { name: string };
  total?: number;
  available?: number;
  status?: string;
  pdf_access?: "FREE" | "PAID" | "RESTRICTED";
  type?: "physical" | "digital";
}

interface Category {
  id: string;
  name: string;
  _count?: { books: number; digital_books?: number };
}

interface Author {
  id: string;
  name: string;
}

interface BookCopy {
  id: string;
  copy_code: string;
  condition: "NEW" | "GOOD" | "WORN" | "DAMAGED" | "LOST";
  is_available: boolean;
  last_condition_update: string;
  notes?: string | null;
  rentals?: Array<{ id: string; user: { id: string; name: string; email: string } }>;
}

interface ConditionHistoryEntry {
  id: string;
  old_condition: string;
  new_condition: string;
  notes?: string | null;
  created_at: string;
  updated_by_user?: { name: string; email: string } | null;
}

const ITEMS_PER_PAGE = 8;

export default function AdminBooksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [physicalBooks, setPhysicalBooks] = useState<Book[]>([]);
  const [digitalBooks, setDigitalBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"physical" | "digital">("physical");
  const [form, setForm] = useState({
    title: "",
    author_id: "",
    category_id: "",
    copies: "",
    description: "",
    publication_year: "",
    tags: "",
    topics: "",
    pdf_access: "RESTRICTED" as "FREE" | "PAID" | "RESTRICTED",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionBookId, setConditionBookId] = useState<string>("");
  const [conditionBookTitle, setConditionBookTitle] = useState("");
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string>("");
  const [conditionHistory, setConditionHistory] = useState<ConditionHistoryEntry[]>([]);
  const [conditionForm, setConditionForm] = useState({ condition: "GOOD", notes: "" });
  const [conditionLoading, setConditionLoading] = useState(false);
  const [conditionSaving, setConditionSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchApi("/books?limit=200").catch(() => null),
      fetchApi("/digital-books?limit=200").catch(() => null),
      fetchApi("/categories").catch(() => null),
      fetchApi("/authors?limit=200").catch(() => null),
    ]).then(([booksData, digitalData, catData, authorData]) => {
      if (booksData?.data?.books)
        setPhysicalBooks(
          booksData.data.books.map((b: Book & { copies?: number; total?: number }) => ({
            ...b,
            total: b.copies ?? b.total,
            type: "physical",
          })),
        );
      else if (booksData?.books)
        setPhysicalBooks(
          booksData.books.map((b: Book) => ({ ...b, type: "physical" })),
        );

      if (digitalData?.data?.books)
        setDigitalBooks(
          digitalData.data.books.map((b: Book) => ({
            ...b,
            total: 0,
            type: "digital",
          })),
        );
      else if (digitalData?.books)
        setDigitalBooks(
          digitalData.books.map((b: Book) => ({ ...b, type: "digital" })),
        );

      if (catData?.data?.categories) setCategories(catData.data.categories);
      else if (catData?.categories) setCategories(catData.categories);
      else if (Array.isArray(catData)) setCategories(catData);

      if (authorData?.authors) setAuthors(authorData.authors);
      else if (authorData?.data?.authors) setAuthors(authorData.data.authors);

      setLoading(false);
    });
  }, []);

  const allBooks = [...physicalBooks, ...digitalBooks];

  const getDisplayBooks = () => {
    const source =
      activeTab === "all"
        ? allBooks
        : activeTab === "physical"
          ? physicalBooks
          : digitalBooks;

    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.name?.toLowerCase().includes(q) ||
        b.category?.name?.toLowerCase().includes(q),
    );
  };

  const handleDeleteBook = async (id: string, type: "physical" | "digital") => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    setDeletingId(id);
    const url =
      type === "physical"
        ? `http://localhost:5000/api/books/${id}`
        : `http://localhost:5000/api/digital-books/${id}`;
    try {
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (type === "physical")
          setPhysicalBooks((prev) => prev.filter((b) => b.id !== id));
        else setDigitalBooks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const loadConditionHistory = async (copyId: string) => {
    const historyRes = await fetchApi(`/books/copies/${copyId}/condition-history`);
    const history = (historyRes?.data?.history || []) as ConditionHistoryEntry[];
    setConditionHistory(history);
  };

  const refreshConditionCopies = async (bookId: string, preferredCopyId?: string) => {
    const copyRes = await fetchApi(`/books/${bookId}/copies`);
    const copies = (copyRes?.data?.copies || []) as BookCopy[];
    setBookCopies(copies);
    if (!copies.length) {
      setSelectedCopyId("");
      setConditionHistory([]);
      return;
    }

    const nextCopy =
      copies.find((copy) => copy.id === preferredCopyId) ||
      copies.find((copy) => copy.id === selectedCopyId) ||
      copies[0];

    setSelectedCopyId(nextCopy.id);
    setConditionForm({
      condition: nextCopy.condition,
      notes: nextCopy.notes || "",
    });
    await loadConditionHistory(nextCopy.id);
  };

  const manageCondition = async (bookId: string, title: string) => {
    try {
      setConditionLoading(true);
      const copyRes = await fetchApi(`/books/${bookId}/copies`);
      const copies = (copyRes?.data?.copies || []) as BookCopy[];
      if (!copies.length) {
        alert("No copy records available for this book.");
        return;
      }
      const firstCopy = copies[0];
      setConditionBookId(bookId);
      setConditionBookTitle(title);
      setBookCopies(copies);
      setSelectedCopyId(firstCopy.id);
      setConditionForm({
        condition: firstCopy.condition,
        notes: firstCopy.notes || "",
      });
      await loadConditionHistory(firstCopy.id);
      setShowConditionModal(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Condition update failed");
    } finally {
      setConditionLoading(false);
    }
  };

  const handleSelectCopy = async (copyId: string) => {
    setSelectedCopyId(copyId);
    const copy = bookCopies.find((item) => item.id === copyId);
    if (copy) {
      setConditionForm({
        condition: copy.condition,
        notes: copy.notes || "",
      });
    }
    await loadConditionHistory(copyId);
  };

  const submitConditionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCopyId) return;
    setConditionSaving(true);
    try {
      await fetchApi(`/books/copies/${selectedCopyId}/condition`, {
        method: "PATCH",
        body: JSON.stringify(conditionForm),
      });
      await refreshConditionCopies(conditionBookId, selectedCopyId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Condition update failed");
    } finally {
      setConditionSaving(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All Books" },
    { key: "physical", label: "Physical Books" },
    { key: "digital", label: "Digital Books" },
    { key: "categories", label: "Categories" },
  ];

  const displayBooks = getDisplayBooks();
  const totalPages = Math.max(
    1,
    Math.ceil(
      activeTab === "categories"
        ? Math.ceil(categories.length / ITEMS_PER_PAGE)
        : Math.ceil(displayBooks.length / ITEMS_PER_PAGE),
    ),
  );
  const paginatedBooks = displayBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const paginatedCategories = categories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch("");
  };

  const openModal = () => {
    setForm({
      title: "",
      author_id: "",
      category_id: "",
      copies: "",
      description: "",
      publication_year: "",
      tags: "",
      topics: "",
      pdf_access: "RESTRICTED",
    });
    setImageFile(null);
    setImagePreview(null);
    setGalleryFiles([]);
    setPdfFile(null);
    setModalTab("physical");
    setShowModal(true);
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategoryId(category.id);
      setCategoryName(category.name);
    } else {
      setEditingCategoryId(null);
      setCategoryName("");
    }
    setShowCategoryModal(true);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "pdf" | "gallery",
  ) => {
    const file = e.target.files?.[0];
    if (type === "gallery") {
      const files = Array.from(e.target.files || []).slice(0, 10);
      setGalleryFiles(files);
      return;
    }
    if (file) {
      if (type === "image") {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        setPdfFile(file);
      }
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author_id || !form.category_id) {
      alert("Please select both author and category.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("author_id", form.author_id);
      fd.append("category_id", form.category_id);
      fd.append("description", form.description);
      if (form.publication_year) fd.append("publication_year", form.publication_year);
      if (form.tags.trim()) fd.append("tags", form.tags);
      if (form.topics.trim()) fd.append("topics", form.topics);
      if (modalTab === "physical") {
        fd.append("total", form.copies);
        if (imageFile) fd.append("image", imageFile);
        galleryFiles.forEach((file) => fd.append("images", file));
        const res = await fetch("http://localhost:5000/api/books", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = await res.json();
        if (data.data?.book)
          setPhysicalBooks((prev) => [
            ...prev,
            { ...data.data.book, type: "physical" },
          ]);
      } else {
        if (imageFile) fd.append("image", imageFile);
        if (pdfFile) fd.append("pdf", pdfFile);
        galleryFiles.forEach((file) => fd.append("images", file));
        fd.append("pdf_access", form.pdf_access);
        const res = await fetch("http://localhost:5000/api/digital-books", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = await res.json();
        if (data.data?.book)
          setDigitalBooks((prev) => [
            ...prev,
            { ...data.data.book, type: "digital" },
          ]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Add book failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setCategorySubmitting(true);
    try {
      const payload = { name: categoryName.trim() };
      if (editingCategoryId) {
        const res = await fetch(`http://localhost:5000/api/categories/${editingCategoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update category");
        const updated = data?.data?.category;
        if (updated) {
          setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        }
      } else {
        const res = await fetch("http://localhost:5000/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create category");
        const created = data?.data?.category;
        if (created) {
          setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setShowCategoryModal(false);
      setEditingCategoryId(null);
      setCategoryName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Category action failed");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? It can only be deleted when no books are assigned.")) return;
    setDeletingCategoryId(id);
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
      setDeletingCategoryId(null);
    }
  };

  return (
    <>
      <div className="p-6 lg:p-12 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-[#2B1A10]">
              Manage Books
            </h1>
            <p className="text-[#AE9E85] font-medium">
              Filter, sort, and access detailed Book profiles
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AE9E85]"
              />
              <input
                type="text"
                placeholder="Search book"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={activeTab === "categories"}
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E1D2BD] rounded-xl text-[#2B1A10] placeholder:text-[#C4B49E] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] w-52 transition-all disabled:opacity-40"
              />
            </div>
            {/* Add button */}
            <button
              onClick={() => (activeTab === "categories" ? openCategoryModal() : openModal())}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3d2413] transition-all whitespace-nowrap"
            >
              <Plus size={16} />
              {activeTab === "categories" ? "Add new category" : "Add new book"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#E1D2BD]/50">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-[#2B1A10] border-[#2B1A10]"
                  : "text-[#AE9E85] border-transparent hover:text-[#2B1A10]/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E1D2BD]/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B4A]"></div>
            </div>
          ) : activeTab === "categories" ? (
            <>
              {/* Category Table Header */}
              <div className="grid grid-cols-[3fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Category Name
                </span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Books
                </span>
                <span className="w-16"></span>
              </div>
              {paginatedCategories.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#AE9E85]">
                  No categories found
                </div>
              ) : (
                paginatedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="grid grid-cols-[3fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors last:border-0"
                  >
                    <span className="text-sm font-bold text-[#2B1A10]">
                      {cat.name}
                    </span>
                    <span className="text-sm text-[#2B1A10]/70">
                      {(cat._count?.books || 0) + (cat._count?.digital_books || 0)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCategoryModal(cat)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6] transition-all"
                      >
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={deletingCategoryId === cat.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {/* Books Table Header */}
              <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#E1D2BD]/50 bg-[#FDFAF6]">
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Title
                </span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Author
                </span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Category
                </span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Total Copies
                </span>
                <span className="text-[11px] font-bold text-[#AE9E85] uppercase tracking-wider">
                  Status
                </span>
                <span className="w-16"></span>
              </div>
              {paginatedBooks.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#AE9E85]">
                  No books found
                </div>
              ) : (
                paginatedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-[#E1D2BD]/30 hover:bg-[#FDFAF6] transition-colors last:border-0"
                  >
                    <span className="text-sm font-bold text-[#2B1A10] truncate">
                      {book.title}
                    </span>
                    <span className="text-sm text-[#8B6B4A] truncate">
                      {book.author?.name || "—"}
                    </span>
                    <span className="text-sm text-[#2B1A10]/70">
                      {book.category?.name || "—"}
                    </span>
                    <span className="text-sm text-[#2B1A10]/70 text-center">
                      {book.type === "digital" ? "Digital" : (book.total ?? "—")}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${
                        book.type === "digital"
                          ? "bg-[#F3EFE6] text-[#2B1A10]"
                          : book.available === 0 || book.status === "BORROWED"
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {book.type === "digital"
                        ? book.pdf_access === "RESTRICTED"
                          ? "Read Only"
                          : "Download Allowed"
                        : book.status ||
                          (book.available === 0 ? "Out of Stock" : "Available")}
                    </span>
                    <div className="flex items-center gap-2">
                      {book.type === "physical" && (
                        <button
                          onClick={() => manageCondition(book.id, book.title)}
                          className="px-2 py-1 text-[10px] font-bold rounded-md border border-[#C2B199] text-[#2B1A10]"
                        >
                          Condition
                        </button>
                      )}
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#AE9E85] hover:text-[#2B1A10] hover:bg-[#F3EFE6] transition-all">
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteBook(book.id, book.type || "physical")
                        }
                        disabled={deletingId === book.id}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
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
                ),
              )}
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

      {/* Add Book Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Tabs */}
            <div className="flex items-center justify-center gap-8 pt-8 pb-4 border-b border-[#E1D2BD]/50 relative">
              <button
                onClick={() => setModalTab("physical")}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                  modalTab === "physical"
                    ? "text-[#2B1A10] border-[#2B1A10]"
                    : "text-[#AE9E85] border-transparent hover:text-[#2B1A10]/60"
                }`}
              >
                Physical Book
              </button>
              <button
                onClick={() => setModalTab("digital")}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                  modalTab === "digital"
                    ? "text-[#2B1A10] border-[#2B1A10]"
                    : "text-[#AE9E85] border-transparent hover:text-[#2B1A10]/60"
                }`}
              >
                Digital Book
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-5 top-6 w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg hover:bg-[#F3EFE6] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleAddBook}
              className="px-8 py-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                />
              </div>

              {/* Author + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Author
                  </label>
                  <select
                    value={form.author_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, author_id: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  >
                    <option value="">Select author</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category_id: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Copies (Physical only) */}
              {modalTab === "physical" && (
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    No of copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.copies}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, copies: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] resize-none focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={form.publication_year}
                    onChange={(e) => setForm((f) => ({ ...f, publication_year: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Topics (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.topics}
                    onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                  />
                </div>
              </div>

              {modalTab === "digital" && (
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    Access Mode
                  </label>
                  <select
                    value={form.pdf_access}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pdf_access: e.target.value as "FREE" | "PAID" | "RESTRICTED",
                      }))
                    }
                    className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  >
                    <option value="RESTRICTED">Read Only</option>
                    <option value="FREE">Allow Download</option>
                  </select>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                  Cover Image
                </label>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#8B6B4A] hover:bg-[#FDFAF5] transition-all group"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-24 object-contain rounded-xl"
                    />
                  ) : (
                    <>
                      <Upload
                        size={22}
                        className="text-[#AE9E85] group-hover:text-[#8B6B4A] transition-colors"
                      />
                      <p className="text-xs text-[#AE9E85]">
                        {imageFile ? imageFile.name : "Click to upload"}
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "image")}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                  Gallery Images (up to 10)
                </label>
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#8B6B4A] hover:bg-[#FDFAF5] transition-all"
                >
                  <p className="text-xs text-[#AE9E85]">
                    {galleryFiles.length > 0
                      ? `${galleryFiles.length} image(s) selected`
                      : "Click to select multiple images"}
                  </p>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(e, "gallery")}
                  className="hidden"
                />
              </div>

              {modalTab === "digital" && (
                <div>
                  <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">
                    PDF File
                  </label>
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="w-full h-28 border-2 border-dashed border-[#E1D2BD] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#8B6B4A] hover:bg-[#FDFAF5] transition-all group"
                  >
                    <Upload
                      size={22}
                      className="text-[#AE9E85] group-hover:text-[#8B6B4A] transition-colors"
                    />
                    <p className="text-xs text-[#AE9E85]">
                      {pdfFile ? pdfFile.name : "Click to upload pdf"}
                    </p>
                  </div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, "pdf")}
                    className="hidden"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3d2413] transition-all disabled:opacity-50 mt-2"
              >
                {submitting ? "Adding..." : "Add book to collection"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCategoryModal(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
              <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">
                {editingCategoryId ? "Edit Category" : "Add Category"}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg hover:bg-[#F3EFE6] transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] focus:outline-none focus:ring-2 focus:ring-[#8B6B4A]/30 focus:border-[#8B6B4A] transition-all"
                  placeholder="Enter category name"
                />
              </div>
              <button
                type="submit"
                disabled={categorySubmitting}
                className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl hover:bg-[#3d2413] transition-all disabled:opacity-50"
              >
                {categorySubmitting ? "Saving..." : editingCategoryId ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showConditionModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConditionModal(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#E1D2BD]/50">
              <div>
                <h3 className="text-xl font-serif font-extrabold text-[#2B1A10]">Condition Tracking</h3>
                <p className="text-sm text-[#AE9E85]">{conditionBookTitle}</p>
              </div>
              <button
                onClick={() => setShowConditionModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#AE9E85] hover:text-[#2B1A10] rounded-lg hover:bg-[#F3EFE6] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-0">
              <div className="border-r border-[#E1D2BD]/50 p-6 space-y-4">
                <h4 className="text-sm font-bold text-[#2B1A10]">Book Copies</h4>
                {conditionLoading ? (
                  <div className="text-sm text-[#AE9E85]">Loading copies...</div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {bookCopies.map((copy) => (
                      <button
                        key={copy.id}
                        type="button"
                        onClick={() => handleSelectCopy(copy.id)}
                        className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                          copy.id === selectedCopyId
                            ? "border-[#2B1A10] bg-[#F8F1E8]"
                            : "border-[#E1D2BD] hover:bg-[#FDFAF6]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#2B1A10]">{copy.copy_code}</p>
                            <p className="text-xs text-[#AE9E85]">
                              {copy.is_available ? "Available" : "Checked out"} • Updated {new Date(copy.last_condition_update).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EFE4D4] text-[#2B1A10]">
                            {copy.condition}
                          </span>
                        </div>
                        {copy.notes && <p className="mt-2 text-xs text-[#6D5339]">{copy.notes}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-5">
                <h4 className="text-sm font-bold text-[#2B1A10]">Update Condition</h4>
                <form onSubmit={submitConditionUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Condition</label>
                    <select
                      value={conditionForm.condition}
                      onChange={(e) => setConditionForm((prev) => ({ ...prev, condition: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10]"
                    >
                      {["NEW", "GOOD", "WORN", "DAMAGED", "LOST"].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#2B1A10] mb-1.5">Notes</label>
                    <textarea
                      rows={4}
                      value={conditionForm.notes}
                      onChange={(e) => setConditionForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-[#E1D2BD] rounded-xl text-[#2B1A10] resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedCopyId || conditionSaving}
                    className="w-full py-3 bg-[#2B1A10] text-white text-sm font-bold rounded-xl disabled:opacity-50"
                  >
                    {conditionSaving ? "Saving..." : "Save Condition"}
                  </button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#2B1A10]">Condition History</h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {conditionHistory.length === 0 ? (
                      <div className="text-sm text-[#AE9E85]">No history yet.</div>
                    ) : (
                      conditionHistory.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-[#E1D2BD] px-4 py-3 bg-[#FDFAF6]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[#2B1A10]">
                              {entry.old_condition} {"->"} {entry.new_condition}
                            </p>
                            <span className="text-[11px] text-[#AE9E85]">
                              {new Date(entry.created_at).toLocaleString()}
                            </span>
                          </div>
                          {entry.notes && <p className="mt-1 text-xs text-[#6D5339]">{entry.notes}</p>}
                          {entry.updated_by_user?.name && (
                            <p className="mt-1 text-[11px] text-[#AE9E85]">By {entry.updated_by_user.name}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
