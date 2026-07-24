"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Star, ChevronLeft, Heart, Download, BookOpen, Eye, AlertCircle, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { usePersona } from "@/components/providers/PersonaProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { API_BASE_URL, fetchApi, fetchCurrentUser } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type User = { id: string; name: string; email: string; role: string } | null;
type ReviewItem = { id: string; rating: number; comment: string | null; created_at: string; user: { id: string; name: string } };
type RatingSummary = { average: number; total: number; distribution: { 1: number; 2: number; 3: number; 4: number; 5: number } };
type PhysicalUserContext = { hasActiveRental: boolean; activeRental: unknown; hasCompletedBorrowPayment?: boolean; isInWishlist: boolean; wishlistId: string | null; hasActiveReservation?: boolean; hasReturnedRental?: boolean; reviewEligibility?: { hasActiveRental: boolean; hasReturnedRental: boolean; canReview: boolean } };
type DigitalUserContext = { isInWishlist: boolean; wishlistId: string | null; hasRead?: boolean };
type PhysicalBook = { id: string; title: string; description: string; cover_image_url: string; pages: number; copies: number; available: number; deleted_at: string | null; author: { id: string; name: string; bio: string; image: string | null }; category: { id: string; name: string; slug: string }; rating: RatingSummary; reviews: ReviewItem[]; reservationCount: number; images?: Array<{ id: string; image_url: string; sort_order: number }>; userContext: PhysicalUserContext | null; _count: { rentals: number; reviews: number; wishlists: number } };
type DigitalBook = { id: string; title: string; description: string; cover_image_url: string; pages: number; pdf_name: string; pdf_access: "FREE" | "PAID" | "RESTRICTED"; deleted_at: string | null; author: { id: string; name: string; bio: string; image: string | null }; category: { id: string; name: string; slug: string }; rating: RatingSummary; reviews: ReviewItem[]; images?: Array<{ id: string; image_url: string; sort_order: number }>; userContext: DigitalUserContext | null; _count: { reviews: number; wishlists: number } };
type RelatedBook = { id: string; title: string; cover_image_url: string; type: "physical" | "digital" };

const REVIEWS_PER_PAGE = 5;

const buildRatingSummary = (reviews: ReviewItem[]): RatingSummary => {
  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  return { average: Number(average.toFixed(1)), total, distribution: { 1: reviews.filter(r => r.rating === 1).length, 2: reviews.filter(r => r.rating === 2).length, 3: reviews.filter(r => r.rating === 3).length, 4: reviews.filter(r => r.rating === 4).length, 5: reviews.filter(r => r.rating === 5).length } };
};

const defaultPhysicalUserContext = (): PhysicalUserContext => ({ hasActiveRental: false, activeRental: null, hasCompletedBorrowPayment: false, isInWishlist: false, wishlistId: null, hasActiveReservation: false, hasReturnedRental: false, reviewEligibility: { hasActiveRental: false, hasReturnedRental: false, canReview: false } });

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }) };

/* ── Star rating display ── */
const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(n => (
      <Star key={n} size={size} className={n <= Math.round(rating) ? "fill-[#f5c518] text-[#f5c518]" : "fill-transparent text-[#e2e0e7]"} />
    ))}
  </div>
);

/* ── Primary action button ── */
function ActionBtn({ label, onClick, disabled, loading, loadingLabel, variant = "primary" }: { label: string; onClick?: () => void; disabled?: boolean; loading?: boolean; loadingLabel?: string; variant?: "primary" | "outline" | "ghost" }) {
  const base = "w-full rounded-2xl px-5 py-3.5 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2";
  const styles = { primary: "bg-[#0d0d0d] text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.30)] hover:-translate-y-0.5 active:translate-y-0", outline: "border-2 border-[#0d0d0d] text-[#0d0d0d] hover:bg-[#0d0d0d] hover:text-white", ghost: "border border-[#e2e0e7] text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d]" };
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={`${base} ${styles[variant]}`}>
      {loading ? (<><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{loadingLabel}</>): label}
    </button>
  );
}

export default function BookDetailPage() {
  const { t } = useLanguage();
  const { activePersona } = usePersona();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from") || "";
  const booksHref = fromQuery ? `/books?${fromQuery}` : "/books";
  const forcedType = searchParams.get("type") === "digital" ? "digital" : "physical";

  const [bookType, setBookType] = useState<"physical" | "digital">(forcedType);
  const [physicalBook, setPhysicalBook] = useState<PhysicalBook | null>(null);
  const [digitalBook, setDigitalBook] = useState<DigitalBook | null>(null);
  const [related, setRelated] = useState<RelatedBook[]>([]);
  const [relatedSource, setRelatedSource] = useState<"author" | "category">("author");
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [digitalLoading, setDigitalLoading] = useState(false);
  const [myReview, setMyReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState<"submit" | "remove" | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [reviewsPage, setReviewsPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "related">("about");

  const book = bookType === "physical" ? physicalBook : digitalBook;

  const updateCurrentBook = (updater: (c: PhysicalBook | DigitalBook) => PhysicalBook | DigitalBook) => {
    if (bookType === "physical") setPhysicalBook(p => p ? (updater(p) as PhysicalBook) : p);
    else setDigitalBook(p => p ? (updater(p) as DigitalBook) : p);
  };

  const galleryImages = useMemo(() => {
    if (!book) return [];
    const extra = (book.images || []).map(img => img.image_url);
    return Array.from(new Set([book.cover_image_url, ...extra].filter(Boolean)));
  }, [book]);

  const pagedReviews = useMemo(() => {
    if (!book?.reviews?.length) return [];
    return book.reviews.slice(reviewsPage * REVIEWS_PER_PAGE, (reviewsPage + 1) * REVIEWS_PER_PAGE);
  }, [book, reviewsPage]);

  const hasPrevReviews = reviewsPage > 0;
  const hasNextReviews = Boolean(book?.reviews?.length) && book != null && (reviewsPage + 1) * REVIEWS_PER_PAGE < (book.reviews?.length ?? 0);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const currentUserPromise = fetchCurrentUser().catch(() => null);
      let foundType: "physical" | "digital" = forcedType;
      let pageData: { book: PhysicalBook | DigitalBook; myReview?: { id: string; rating: number; comment: string | null } | null; related?: RelatedBook[]; relatedSource?: "author" | "category" } | null = null;
      if (forcedType === "digital") {
        const d = await fetchApi(`/digital-books/${params.id}/page-data`);
        pageData = d?.data || null;
      } else {
        try { const p = await fetchApi(`/books/${params.id}/page-data`); pageData = p?.data || null; foundType = "physical"; }
        catch { const d = await fetchApi(`/digital-books/${params.id}/page-data`); pageData = d?.data || null; foundType = "digital"; }
      }
      const detail = pageData?.book || null;
      if (!detail) { setError(t("book_details.not_found.title") as string); return; }
      const currentUser = await currentUserPromise;
      setUser(currentUser); setBookType(foundType);
      if (foundType === "physical") { setPhysicalBook(detail as PhysicalBook); setDigitalBook(null); }
      else { setDigitalBook(detail as DigitalBook); setPhysicalBook(null); }
      const detailImages = ("images" in detail && Array.isArray(detail.images) ? detail.images : []) as Array<{ image_url: string }>;
      setActiveImage(detailImages[0]?.image_url || detail.cover_image_url);
      const mine = pageData?.myReview || null;
      setMyReview(mine); setReviewRating(mine?.rating || 0); setReviewComment(mine?.comment || "");
      setRelatedSource(pageData?.relatedSource || "author");
      setRelated((pageData?.related || []) as RelatedBook[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load book"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [params.id, forcedType]); // eslint-disable-line

  useEffect(() => {
    const total = book?.reviews?.length || 0;
    if (total <= REVIEWS_PER_PAGE) { if (reviewsPage !== 0) setReviewsPage(0); return; }
    const max = Math.max(0, Math.ceil(total / REVIEWS_PER_PAGE) - 1);
    if (reviewsPage > max) setReviewsPage(max);
  }, [book?.reviews?.length, reviewsPage]);

  const isAdmin = Boolean(user) && activePersona === "ADMIN";
  const isStudent = Boolean(user) && activePersona === "STUDENT";
  const reviewEligibility = physicalBook?.userContext?.reviewEligibility;
  const canManageReview = isStudent && (bookType === "physical" ? Boolean(reviewEligibility?.hasReturnedRental) && !Boolean(reviewEligibility?.hasActiveRental) : Boolean(digitalBook?.userContext?.hasRead));
  const trimmedReviewComment = reviewComment.trim();
  const isReviewTextValid = trimmedReviewComment.length > 0;
  const reviewBusy = reviewAction !== null;
  const isSubmittingReview = reviewAction === "submit";
  const isRemovingReview = reviewAction === "remove";

  const handleBorrow = async () => {
    if (!physicalBook || borrowLoading) return;
    const currentUser = user ?? (await fetchCurrentUser());
    if (!currentUser) { router.push("/auth/login"); return; }
    if (!user) setUser(currentUser);
    const rentalId = physicalBook.userContext?.hasActiveRental && !physicalBook.userContext?.hasCompletedBorrowPayment ? ((physicalBook.userContext?.activeRental as { id?: string } | null)?.id ?? null) : null;
    try {
      setBorrowLoading(true);
      let targetRentalId = rentalId;
      if (!targetRentalId) { const r = await fetchApi("/rentals/borrow", { method: "POST", body: JSON.stringify({ book_id: physicalBook.id, allow_debt_settlement: true }) }); targetRentalId = r?.data?.rental?.id; }
      if (!targetRentalId) throw new Error("Borrowed rental was not created");
      const payRes = await fetchApi(`/payments/rental/${targetRentalId}/initiate`, { method: "POST", body: JSON.stringify({ method: "CHAPA", context: "BORROW" }) });
      const chapaUrl = payRes?.data?.chapaUrl || payRes?.data?.checkout_url || payRes?.chapaUrl || payRes?.checkout_url || (payRes?.data?.payment?.tx_ref ? `https://checkout.chapa.co/checkout/payment/${payRes.data.payment.tx_ref}` : "");
      if (!chapaUrl) throw new Error("Payment checkout URL was not returned");
      window.location.assign(chapaUrl);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Borrow checkout failed"); }
    finally { setBorrowLoading(false); }
  };

  const handleReserve = async () => {
    if (!user) return router.push("/auth/login");
    if (!physicalBook || reserveLoading) return;
    const prev = physicalBook;
    try {
      setReserveLoading(true);
      setPhysicalBook(p => p ? { ...p, reservationCount: p.reservationCount + 1, userContext: { ...(p.userContext || defaultPhysicalUserContext()), hasActiveReservation: true } } : p);
      const res = await fetchApi<{ data?: { reservation?: { queue_position?: number } } }>("/reservations", { method: "POST", body: JSON.stringify({ book_id: physicalBook.id }) });
      const qp = res?.data?.reservation?.queue_position;
      if (typeof qp === "number") setPhysicalBook(p => p ? { ...p, reservationCount: Math.max(p.reservationCount, qp) } : p);
      toast.success("Reservation placed successfully");
    } catch (err) { setPhysicalBook(prev); toast.error(err instanceof Error ? err.message : "Failed to place reservation"); }
    finally { setReserveLoading(false); }
  };

  const handleWishlist = async () => {
    if (!user) return router.push("/auth/login");
    if (!book || wishlistLoading) return;
    const prevP = physicalBook; const prevD = digitalBook;
    try {
      setWishlistLoading(true);
      const isIn = book.userContext?.isInWishlist; const wId = book.userContext?.wishlistId;
      updateCurrentBook(c => {
        if ("copies" in c) { const ctx = c.userContext || { hasActiveRental: false, activeRental: null, isInWishlist: false, wishlistId: null }; return { ...c, userContext: { ...ctx, isInWishlist: !ctx.isInWishlist, wishlistId: ctx.isInWishlist ? null : ctx.wishlistId } }; }
        const ctx = c.userContext || { isInWishlist: false, wishlistId: null }; return { ...c, userContext: { ...ctx, isInWishlist: !ctx.isInWishlist, wishlistId: ctx.isInWishlist ? null : ctx.wishlistId } };
      });
      if (isIn && wId) { await fetchApi(`/wishlist/${wId}`, { method: "DELETE" }); toast.success("Removed from wishlist"); }
      else {
        const r = await fetchApi<{ data?: { item?: { id?: string } } }>("/wishlist", { method: "POST", body: JSON.stringify({ bookType: bookType.toUpperCase(), bookId: book.id }) });
        const createdId = r?.data?.item?.id || null;
        updateCurrentBook(c => { if ("copies" in c) { const ctx = c.userContext || defaultPhysicalUserContext(); return { ...c, userContext: { ...ctx, isInWishlist: true, wishlistId: createdId } }; } return { ...c, userContext: { ...(c.userContext || { isInWishlist: false, wishlistId: null }), isInWishlist: true, wishlistId: createdId } }; });
        toast.success("Added to wishlist");
      }
    } catch { setPhysicalBook(prevP); setDigitalBook(prevD); toast.error("Failed to update wishlist"); }
    finally { setWishlistLoading(false); }
  };

  const openDigital = async (download = false) => {
    if (!book || bookType !== "digital") return;
    try {
      setDigitalLoading(true);
      const currentUser = user ?? (await fetchCurrentUser());
      if (!currentUser) { router.push("/auth/login"); return; }
      if (!user) setUser(currentUser);
      if (!download) await fetchApi(`/digital-books/${book.id}/read`, { method: "POST" });
      const url = `${API_BASE_URL}/digital-books/${book.id}/pdf${download ? "?download=true" : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) { const t2 = await response.text(); try { const d = JSON.parse(t2); throw new Error(d.message || `Failed to load PDF (${response.status})`); } catch { throw new Error(`Failed to load PDF (${response.status})`); } }
      const contentType = response.headers.get("Content-Type"); const blob = await response.blob();
      if (!contentType?.includes("application/pdf") || blob.size === 0) throw new Error("PDF file is empty");
      const blobUrl = window.URL.createObjectURL(blob);
      const cd = response.headers.get("Content-Disposition");
      const fileName = cd ? cd.split("filename=")[1]?.replace(/"/g, "") : `${book.title}.pdf`;
      if (download) { const a = document.createElement("a"); a.href = blobUrl; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
      else { window.open(blobUrl, "_blank"); setDigitalBook(p => p ? { ...p, userContext: { ...(p.userContext || { isInWishlist: false, wishlistId: null }), hasRead: true } } : p); }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.error_occurred") as string); }
    finally { setDigitalLoading(false); }
  };

  const submitReview = async () => {
    if (!user) return router.push("/auth/login");
    if (!book || reviewRating < 1 || !canManageReview || !isReviewTextValid) return;
    const prevP = physicalBook; const prevD = digitalBook; const prevR = myReview;
    const opt = { id: myReview?.id || `temp-${Date.now()}`, rating: reviewRating, comment: trimmedReviewComment, created_at: new Date().toISOString(), user: { id: user.id, name: user.name } };
    const next = myReview ? (book.reviews || []).map(r => r.id === myReview.id ? opt : r) : [opt, ...(book.reviews || [])];
    setMyReview({ id: opt.id, rating: reviewRating, comment: trimmedReviewComment || null });
    updateCurrentBook(c => ({ ...c, reviews: next, rating: buildRatingSummary(next) }));
    try {
      setReviewAction("submit");
      let resp: { data?: { review?: ReviewItem; ratingSummary?: RatingSummary } } | undefined;
      if (myReview) resp = await fetchApi(`/reviews/${myReview.id}`, { method: "PATCH", body: JSON.stringify({ rating: reviewRating, comment: trimmedReviewComment }) });
      else resp = await fetchApi(`/reviews/${bookType}/${book.id}`, { method: "POST", body: JSON.stringify({ rating: reviewRating, comment: trimmedReviewComment }) });
      const saved = resp?.data?.review || opt; const savedRating = resp?.data?.ratingSummary || buildRatingSummary(next);
      setMyReview({ id: saved.id, rating: saved.rating, comment: saved.comment || null });
      updateCurrentBook(c => ({ ...c, reviews: c.reviews.map(r => r.id === opt.id || (myReview && r.id === myReview.id) ? saved : r), rating: savedRating }));
      toast.success("Review saved");
    } catch (err) { setPhysicalBook(prevP); setDigitalBook(prevD); setMyReview(prevR); toast.error(err instanceof Error ? err.message : "Failed to save review"); }
    finally { setReviewAction(null); }
  };

  const removeReview = async () => {
    if (!user || !myReview) return;
    const prevP = physicalBook; const prevD = digitalBook; const prevR = myReview;
    setMyReview(null); setReviewRating(0); setReviewComment("");
    updateCurrentBook(c => { const nr = (c.reviews || []).filter(r => r.id !== prevR.id); return { ...c, reviews: nr, rating: buildRatingSummary(nr) }; });
    try { setReviewAction("remove"); await fetchApi(`/reviews/${myReview.id}`, { method: "DELETE" }); toast.success("Review removed"); }
    catch { setPhysicalBook(prevP); setDigitalBook(prevD); setMyReview(prevR); setReviewRating(prevR.rating); setReviewComment(prevR.comment || ""); toast.error("Failed to remove review"); }
    finally { setReviewAction(null); }
  };

  const canBorrow = bookType === "physical" && physicalBook && physicalBook.available > 0 && !physicalBook.userContext?.hasActiveRental;
  const hasFullyBorrowed = bookType === "physical" && physicalBook && physicalBook.userContext?.hasActiveRental && physicalBook.userContext?.hasCompletedBorrowPayment;
  const hasPendingBorrowPayment = bookType === "physical" && physicalBook && physicalBook.userContext?.hasActiveRental && !physicalBook.userContext?.hasCompletedBorrowPayment;
  const displayedAvailableCopies = bookType === "physical" && physicalBook ? Math.min(physicalBook.copies, physicalBook.available + (hasPendingBorrowPayment ? 1 : 0)) : 0;
  const shouldShowReserve = bookType === "physical" && physicalBook && physicalBook.available === 0;
  const reserveCount = physicalBook?.reservationCount || 0;

  /* ── Error / not found ── */
  if (!loading && (error || !book)) {
    return (
      <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-serif font-black text-[#0d0d0d] mb-3">{t("book_details.not_found.title") as string}</h1>
            <p className="text-sm text-[#6b7280] mb-8">{error || t("book_details.not_found.desc") as string}</p>
            <Link href="/books" className="inline-flex items-center gap-2 rounded-2xl bg-[#0d0d0d] px-7 py-3.5 text-sm font-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 transition-all">
              <ArrowLeft size={15} />{t("book_details.not_found.button") as string}
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (loading || !book) {
    return (
      <div className="min-h-screen bg-[#f8f7fc] flex flex-col">
        <Navbar />
        <div className="relative bg-[#0d0d0d] overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
            <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse mb-4" />
            <div className="flex gap-10">
              <div className="w-52 h-72 rounded-2xl bg-white/08 animate-pulse shrink-0" />
              <div className="flex-1 space-y-4 pt-2">
                <div className="h-8 w-3/4 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-5 w-1/3 bg-white/08 rounded-lg animate-pulse" />
                <div className="h-4 w-1/4 bg-white/06 rounded-lg animate-pulse" />
                <div className="flex gap-3 mt-6">
                  <div className="h-12 w-36 rounded-2xl bg-white/10 animate-pulse" />
                  <div className="h-12 w-36 rounded-2xl bg-white/08 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-10">
          <div className="h-64 rounded-2xl bg-white animate-pulse" />
        </div>
        <Footer />
      </div>
    );
  }
