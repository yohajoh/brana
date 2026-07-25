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
  const base = "rounded-xl px-4 py-2 text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0";
  const styles = { primary: "bg-[#f5c518] text-[#0d0d0d] shadow-[0_3px_12px_rgba(245,197,24,0.40)] hover:shadow-[0_6px_20px_rgba(245,197,24,0.50)] hover:-translate-y-0.5 active:translate-y-0", outline: "border border-white/30 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/50", ghost: "border border-white/20 text-white/60 hover:border-white/40 hover:text-white" };
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={`${base} ${styles[variant]}`}>
      {loading ? (<><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />{loadingLabel}</>): label}
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
        <div className="relative overflow-hidden" style={{ height: "calc(60vh + 64px)", minHeight: "584px", maxHeight: "844px", background: "#8b919e" }}>
          {/* Subtle radial highlight — same grey-blue tone as the screenshot */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 55% 40%, rgba(255,255,255,0.10) 0%, transparent 60%)" }} />
          <div className="absolute inset-0 flex items-center px-8">
            <div className="w-[50%] flex items-center justify-center">
              <div className="rounded-2xl animate-pulse" style={{ width: "68%", height: "80%", background: "rgba(0,0,0,0.15)" }} />
            </div>
            <div className="flex-1 space-y-4 pl-8">
              <div className="h-3 w-24 rounded-full animate-pulse bg-white/20" />
              <div className="h-8 w-4/5 rounded-xl animate-pulse bg-white/25" />
              <div className="h-5 w-2/5 rounded-lg animate-pulse bg-white/18" />
              <div className="h-4 w-1/3 rounded-lg animate-pulse bg-white/15 mt-2" />
              <div className="flex gap-2 mt-4">
                <div className="h-8 w-24 rounded-xl animate-pulse bg-white/20" />
                <div className="h-8 w-24 rounded-xl animate-pulse bg-white/15" />
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

  /* ── Main render ── */
  const isAvailable = bookType === "digital" || (physicalBook?.available ?? 0) > 0;
  const statusLabel = bookType === "digital"
    ? (book as DigitalBook).pdf_access === "RESTRICTED" ? t("book_details.status.read_only") as string : t("book_details.status.download") as string
    : displayedAvailableCopies > 0 ? t("book_details.status.available", { count: displayedAvailableCopies }) as string : t("book_details.status.unavailable") as string;

  const tabs = [
    { id: "about",   label: t("book_details.about_book") as string },
    { id: "reviews", label: `${t("book_details.reviews.title") as string} (${book.reviews?.length ?? 0})` },
    { id: "related", label: relatedSource === "author" ? t("book_details.sections.more_by", { name: book.author.name }) as string : t("book_details.sections.related_in", { name: book.category.name }) as string },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-[#0d0d0d] flex flex-col">
      <Navbar />

      {/* ── Hero band — 60vh ── */}
      <section
        className="relative overflow-hidden"
        style={{ height: "calc(60vh + 64px)", minHeight: "584px", maxHeight: "844px", paddingTop: "64px" }}
      >
        {/* Background = blurred book cover fills the entire section */}
        <div className="absolute inset-0">
          <Image
            src={activeImage || book.cover_image_url || "/reading_illustration.png"}
            alt="" fill priority className="object-cover object-top scale-110"
            style={{ filter: "blur(28px)", transform: "scale(1.15)" }}
          />
          {/* Lighter overlay — 38% opacity so cover colours bleed through */}
          <div className="absolute inset-0 bg-black/38" />
          {/* Subtle gold tint at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f5c518]/60 via-[#f5c518] to-transparent" />
        </div>

        {/* ── Left panel: full width on mobile, 50% on desktop ── */}
        <div className="absolute top-0 left-0 bottom-0 w-full lg:w-[50%] flex items-center justify-center">

          {/* Card — object-contain so full cover shows with no crop */}
          <AnimatePresence mode="wait">
            <motion.div key={activeImage}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl overflow-hidden shadow-[0_24px_72px_rgba(0,0,0,0.75)] border border-white/15 bg-black/30"
              style={{ width: "55%", height: "88%" }}
            >
              <Image
                src={activeImage || book.cover_image_url || "/reading_illustration.png"}
                alt={book.title} fill priority
                className="object-contain"
              />
              {/* Bottom badges */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black backdrop-blur-md border ${
                  bookType === "digital" ? "bg-black/70 text-white border-white/15" :
                  isAvailable ? "bg-emerald-600/85 text-white border-emerald-400/25" : "bg-red-600/85 text-white border-red-400/25"
                }`}>{statusLabel}</div>
                {bookType === "digital" && <div className="px-2 py-1 rounded-lg bg-[#f5c518] text-[10px] font-black text-[#0d0d0d]">Digital</div>}
              </div>
              {/* Counter */}
              {galleryImages.length > 1 && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-black text-white/80 border border-white/10">
                  {galleryImages.indexOf(activeImage) + 1}/{galleryImages.length}
                </div>
              )}
              {/* Prev/Next */}
              {galleryImages.length > 1 && (
                <>
                  <button onClick={() => { const idx = galleryImages.indexOf(activeImage); setActiveImage(galleryImages[(idx - 1 + galleryImages.length) % galleryImages.length]); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-black/75 hover:text-white transition-all z-10">
                    <ChevronLeft size={13} />
                  </button>
                  <button onClick={() => { const idx = galleryImages.indexOf(activeImage); setActiveImage(galleryImages[(idx + 1) % galleryImages.length]); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-black/75 hover:text-white transition-all z-10">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
              style={{ scrollbarWidth: "none" }}
            >
              {galleryImages.map((img, i) => {
                const isAct = activeImage === img;
                return (
                  <motion.button key={i} whileHover={{ y: -2, scale: 1.06 }} whileTap={{ scale: 0.93 }}
                    onClick={() => setActiveImage(img)}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all ${isAct ? "w-8 h-11 border-[#f5c518] opacity-100" : "w-6 h-8 border-white/15 opacity-40 hover:opacity-80"}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                    {isAct && <div className="absolute inset-0 bg-[#f5c518]/12" />}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: text — desktop only at 50%→right, mobile shown below hero ── */}
        <div className="hidden lg:flex absolute top-0 bottom-0 flex-col justify-between px-8 lg:px-12 py-8"
          style={{ left: "50%", right: 0 }}>
          {/* Breadcrumb */}
          <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 text-[11px] font-semibold text-white/35">
            <Link href={booksHref} className="hover:text-white/70 transition-colors flex items-center gap-1">
              <ChevronLeft size={12} />{t("book_details.breadcrumb.books") as string}
            </Link>
            <span>/</span>
            <span className="text-white/45">{bookType === "digital" ? t("book_details.breadcrumb.digital") as string : t("book_details.breadcrumb.physical") as string}</span>
          </motion.nav>

          {/* Book info — vertically centred */}
          <div className="flex-1 flex flex-col justify-center py-3">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-2">{book.category.name}</span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-white leading-tight mb-2 line-clamp-3">{book.title}</h1>
              <p className="text-white/50 text-sm mb-4">by <span className="text-white/75 font-semibold">{book.author.name}</span></p>
            </motion.div>

            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Stars rating={book.rating.average} size={13} />
                <span className="text-white font-bold text-xs">{book.rating.total > 0 ? book.rating.average.toFixed(1) : "—"}</span>
                <span className="text-white/35 text-[11px]">({book.rating.total})</span>
              </div>
              {book.pages > 0 && <span className="text-white/35 text-[11px] border-l border-white/15 pl-3">{book.pages} pages</span>}
              {bookType === "physical" && <span className="text-white/35 text-[11px] border-l border-white/15 pl-3">{(physicalBook?._count?.rentals ?? 0)} borrows</span>}
            </motion.div>

            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="flex flex-row flex-wrap gap-2">
              {bookType === "physical" ? (!isAdmin ? (
                <>
                  {hasFullyBorrowed && <ActionBtn label={t("book_details.actions.currently_borrowed") as string} disabled variant="outline" />}
                  {hasPendingBorrowPayment && <ActionBtn label={t("book_details.actions.complete_payment") as string} loading={borrowLoading} loadingLabel={t("shared.loading") as string || "Loading..."} onClick={handleBorrow} />}
                  {canBorrow && <ActionBtn label={t("book_details.actions.borrow") as string} loading={borrowLoading} loadingLabel={t("shared.loading") as string || "Loading..."} onClick={handleBorrow} />}
                  {shouldShowReserve && (
                    <div className="flex flex-col gap-1.5">
                      <ActionBtn label={physicalBook?.userContext?.hasActiveReservation ? t("book_details.labels.already_reserved") as string : t("book_details.actions.reserve_label") as string}
                        loading={reserveLoading} loadingLabel={t("admin_reservations.modal.issuing") as string}
                        disabled={Boolean(physicalBook?.userContext?.hasActiveReservation)} onClick={handleReserve} variant="outline" />
                      <p className="text-[11px] text-white/35">{t("book_details.labels.students_in_queue", { count: reserveCount }) as string}</p>
                    </div>
                  )}
                  {!hasFullyBorrowed && !hasPendingBorrowPayment && !canBorrow && !shouldShowReserve && (
                    <ActionBtn label={t("book_details.status.unavailable") as string} disabled variant="outline" />
                  )}
                </>
              ) : null) : isStudent ? (
                <>
                  <ActionBtn label={digitalLoading ? t("book_details.actions.opening_pdf") as string : t("book_details.actions.read_now") as string}
                    loading={digitalLoading} loadingLabel={t("book_details.actions.opening_pdf") as string} onClick={() => openDigital(false)} />
                  {(book as DigitalBook).pdf_access !== "RESTRICTED" && (
                    <ActionBtn label={t("book_details.actions.download_pdf") as string}
                      loading={digitalLoading} loadingLabel={t("book_details.actions.preparing_download") as string} onClick={() => openDigital(true)} variant="outline" />
                  )}
                </>
              ) : null}
              {isStudent && (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                  onClick={handleWishlist} disabled={wishlistLoading}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all border ${book.userContext?.isInWishlist ? "border-[#f5c518] bg-[#f5c518]/12 text-[#f5c518]" : "border-white/20 text-white/60 hover:border-white/45 hover:text-white"} disabled:opacity-50`}>
                  <Heart size={13} fill={book.userContext?.isInWishlist ? "currentColor" : "none"} />
                  {wishlistLoading ? t("book_details.actions.updating_wishlist") as string : book.userContext?.isInWishlist ? t("book_details.actions.in_wishlist") as string : t("book_details.actions.wishlist") as string}
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Gold accent line — bottom */}
          <div className="h-px bg-gradient-to-r from-[#f5c518]/40 via-[#f5c518]/15 to-transparent" />
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-[#f8f7fc] pointer-events-none" />
      </section>

      {/* ── MOBILE: book info (visible only on mobile, below hero) ── */}
      <div className="lg:hidden bg-[#0d0d0d] px-5 py-6">
        <span className="inline-block text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c518] mb-1">{book.category.name}</span>
        <h1 className="text-2xl font-serif font-black text-white leading-tight mb-1 break-words">{book.title}</h1>
        <p className="text-white/50 text-sm mb-4">by <span className="text-white/75 font-semibold">{book.author.name}</span></p>
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5"><Stars rating={book.rating.average} size={13} /><span className="text-white font-bold text-xs">{book.rating.total > 0 ? book.rating.average.toFixed(1) : "—"}</span><span className="text-white/35 text-[11px]">({book.rating.total})</span></div>
          {book.pages > 0 && <span className="text-white/35 text-[11px] border-l border-white/15 pl-3">{book.pages} pages</span>}
        </div>
        <div className="flex flex-row flex-wrap gap-2">
          {bookType === "physical" ? (!isAdmin ? (<>
            {hasFullyBorrowed && <ActionBtn label={t("book_details.actions.currently_borrowed") as string} disabled variant="outline" />}
            {hasPendingBorrowPayment && <ActionBtn label={t("book_details.actions.complete_payment") as string} loading={borrowLoading} loadingLabel="..." onClick={handleBorrow} />}
            {canBorrow && <ActionBtn label={t("book_details.actions.borrow") as string} loading={borrowLoading} loadingLabel="..." onClick={handleBorrow} />}
            {shouldShowReserve && <ActionBtn label={physicalBook?.userContext?.hasActiveReservation ? t("book_details.labels.already_reserved") as string : t("book_details.actions.reserve_label") as string} loading={reserveLoading} loadingLabel="..." disabled={Boolean(physicalBook?.userContext?.hasActiveReservation)} onClick={handleReserve} variant="outline" />}
          </>) : null) : isStudent ? (<>
            <ActionBtn label={t("book_details.actions.read_now") as string} loading={digitalLoading} loadingLabel="..." onClick={() => openDigital(false)} />
            {(book as DigitalBook).pdf_access !== "RESTRICTED" && <ActionBtn label={t("book_details.actions.download_pdf") as string} loading={digitalLoading} loadingLabel="..." onClick={() => openDigital(true)} variant="outline" />}
          </>) : null}
          {isStudent && (<motion.button whileTap={{ scale: 0.95 }} onClick={handleWishlist} disabled={wishlistLoading}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap border transition-all ${book.userContext?.isInWishlist ? "border-[#f5c518] bg-[#f5c518]/12 text-[#f5c518]" : "border-white/20 text-white/60 hover:border-white/45 hover:text-white"} disabled:opacity-50`}>
            <Heart size={13} fill={book.userContext?.isInWishlist ? "currentColor" : "none"} />
            {book.userContext?.isInWishlist ? t("book_details.actions.in_wishlist") as string : t("book_details.actions.wishlist") as string}
          </motion.button>)}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="bg-white border-b border-[#e2e0e7]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-px bg-[#e2e0e7] overflow-x-auto">
            {[
              { label: t("book_details.labels.rating") as string, value: book.rating.total > 0 ? book.rating.average.toFixed(1) + " ★" : "—" },
              { label: t("book_details.labels.category") as string, value: book.category.name },
              { label: bookType === "digital" ? t("book_details.labels.access") as string : t("book_details.labels.available_on_shelf") as string,
                value: bookType === "digital" ? ((book as DigitalBook).pdf_access === "RESTRICTED" ? t("book_details.status.read_only") as string : t("book_details.labels.read_and_download") as string) : (displayedAvailableCopies === 1 ? t("book_details.labels.copy", { count: displayedAvailableCopies }) as string : t("book_details.labels.copies", { count: displayedAvailableCopies }) as string) },
              ...(book.pages > 0 ? [{ label: "Pages", value: String(book.pages) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 min-w-[120px] bg-white px-5 py-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af] mb-1">{label}</div>
                <div className="text-sm font-black text-[#0d0d0d]">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs + content ── */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: tab content ── */}
          <div className="flex-1 min-w-0">
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-[#e2e0e7] p-1.5 mb-6 overflow-x-auto shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex-1 min-w-max px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-1 ${activeTab === tab.id ? "text-white" : "text-[#374151] hover:text-[#0d0d0d]"}`}
                >
                  {activeTab === tab.id && (
                    <motion.span layoutId="tab-active" className="absolute inset-0 rounded-xl bg-[#0d0d0d]"
                      style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "about" && (
                <motion.div key="about" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">

                  {/* Description */}
                  <div className="bg-white rounded-2xl border border-[#e2e0e7] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                    <h2 className="text-lg font-serif font-black text-[#0d0d0d] mb-4 flex items-center gap-2">
                      <BookOpen size={18} className="text-[#f5c518]" />
                      {t("book_details.about_book") as string}
                    </h2>
                    <p className="text-sm text-[#374151] leading-relaxed break-words">{book.description}</p>
                  </div>

                  {/* Author */}
                  {(book.author.bio || book.author.image) && (
                    <div className="bg-white rounded-2xl border border-[#e2e0e7] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                      <h2 className="text-lg font-serif font-black text-[#0d0d0d] mb-4">{t("book_details.about_author") as string}</h2>
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#e2e0e7] shrink-0 bg-[#f1f0f4]">
                          <Image src={book.author.image || "/reading_illustration.png"} alt={book.author.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[#0d0d0d] mb-1 break-words">{book.author.name}</p>
                          <p className="text-sm text-[#374151] leading-relaxed break-words">{book.author.bio || t("book_details.labels.no_bio") as string}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Write review */}
                  {!isAdmin && canManageReview && (
                    <div className="bg-white rounded-2xl border border-[#e2e0e7] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <h2 className="text-lg font-serif font-black text-[#0d0d0d] mb-5">{t("book_details.reviews.write_title") as string}</h2>
                      <div className="space-y-4">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <motion.button key={n} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                              onClick={() => setReviewRating(n)} className="text-[#f5c518]">
                              <Star size={22} fill={reviewRating >= n ? "currentColor" : "none"} strokeWidth={1.5} />
                            </motion.button>
                          ))}
                        </div>
                        <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                          placeholder={t("book_details.reviews.placeholder") as string}
                          className="w-full rounded-2xl border border-[#e2e0e7] bg-[#f8f7fc] px-4 py-3 text-sm text-[#0d0d0d] outline-none focus:border-[#0d0d0d] focus:shadow-[0_0_0_3px_rgba(245,197,24,0.25)] transition-all resize-none"
                          rows={4} />
                        <div className="flex gap-3">
                          <ActionBtn label={isSubmittingReview ? t("book_details.actions.submitting_review") as string : myReview ? t("book_details.actions.update_review") as string : t("book_details.actions.submit_review") as string}
                            onClick={submitReview} disabled={reviewBusy || reviewRating < 1 || !isReviewTextValid} loading={isSubmittingReview} loadingLabel={t("book_details.actions.submitting_review") as string} />
                          {myReview && (
                            <ActionBtn label={isRemovingReview ? t("book_details.actions.removing_review") as string : t("book_details.reviews.remove") as string}
                              onClick={removeReview} disabled={reviewBusy} loading={isRemovingReview} loadingLabel={t("book_details.actions.removing_review") as string} variant="ghost" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isAdmin && bookType === "digital" && isStudent && !canManageReview && (
                    <div className="rounded-2xl border border-[#e2e0e7] bg-white p-5">
                      <div className="flex items-center gap-3">
                        <Eye size={18} className="text-[#9ca3af] shrink-0" />
                        <p className="text-sm text-[#6b7280]">{t("book_details.reviews.unlock_digital") as string}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                  {book.reviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#e2e0e7] p-10 text-center">
                      <Star size={28} className="text-[#e2e0e7] mx-auto mb-3" />
                      <p className="text-sm text-[#9ca3af]">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pagedReviews.map((review, i) => (
                        <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.35 }}
                          className="bg-white rounded-2xl border border-[#e2e0e7] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0d0d0d] flex items-center justify-center text-white text-xs font-black shrink-0">
                                {review.user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#0d0d0d]">{review.user.name}</p>
                                <p className="text-[11px] text-[#9ca3af]">{new Date(review.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Stars rating={review.rating} size={13} />
                          </div>
                          {review.comment && <p className="text-sm text-[#374151] leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>}
                        </motion.div>
                      ))}

                      {book.reviews.length > REVIEWS_PER_PAGE && (
                        <div className="flex items-center justify-between pt-2">
                          <button onClick={() => setReviewsPage(p => Math.max(0, p-1))} disabled={!hasPrevReviews}
                            className="text-xs font-bold text-[#374151] hover:text-[#0d0d0d] disabled:opacity-35 transition-colors">
                            ← {t("digital_library.previous") as string}
                          </button>
                          <span className="text-xs text-[#9ca3af]">
                            {reviewsPage * REVIEWS_PER_PAGE + 1}–{Math.min((reviewsPage+1)*REVIEWS_PER_PAGE, book.reviews.length)} / {book.reviews.length}
                          </span>
                          <button onClick={() => setReviewsPage(p => p+1)} disabled={!hasNextReviews}
                            className="text-xs font-bold text-[#374151] hover:text-[#0d0d0d] disabled:opacity-35 transition-colors">
                            {t("digital_library.next") as string} →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "related" && (
                <motion.div key="related" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                  {related.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#e2e0e7] p-10 text-center">
                      <p className="text-sm text-[#9ca3af]">{t("book_details.sections.none_related") as string}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {related.map((item, i) => (
                        <motion.div key={`${item.type}-${item.id}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                          <Link href={item.type === "digital" ? `/books/${item.id}?type=digital` : `/books/${item.id}`}
                            className="group block bg-white rounded-2xl border border-[#e2e0e7] p-3 hover:border-[#0d0d0d] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all">
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3">
                              <Image src={item.cover_image_url || "/reading_illustration.png"} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              {item.type === "digital" && (
                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-[#f5c518] text-[9px] font-black text-[#0d0d0d]">Digital</div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[#0d0d0d] line-clamp-2 group-hover:text-[#f5c518] transition-colors">{item.title}</p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: rating breakdown sidebar ── */}
          <div className="lg:w-64 xl:w-72 shrink-0 space-y-4">
            {/* Rating summary card */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-2xl border border-[#e2e0e7] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9ca3af] mb-4">
                {t("book_details.labels.rating") as string}
              </p>
              <div className="flex items-end gap-3 mb-5">
                <span className="text-5xl font-serif font-black text-[#0d0d0d] leading-none">
                  {book.rating.total > 0 ? book.rating.average.toFixed(1) : "—"}
                </span>
                <div className="pb-1">
                  <Stars rating={book.rating.average} size={15} />
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {book.rating.total} {book.rating.total === 1 ? t("book_details.labels.review") as string : t("book_details.labels.reviews") as string}
                  </p>
                </div>
              </div>
              {/* Distribution bars */}
              {book.rating.total > 0 && (
                <div className="space-y-2">
                  {([5,4,3,2,1] as const).map(n => {
                    const count = book.rating.distribution[n] || 0;
                    const pct = book.rating.total > 0 ? (count / book.rating.total) * 100 : 0;
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#374151] w-3">{n}</span>
                        <Star size={10} className="text-[#f5c518] fill-[#f5c518] shrink-0" />
                        <div className="flex-1 h-1.5 bg-[#f1f0f4] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.4 + (5-n)*0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full bg-[#f5c518] rounded-full" />
                        </div>
                        <span className="text-[10px] text-[#9ca3af] w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Wishlist / quick action */}
            {isStudent && (
              <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleWishlist} disabled={wishlistLoading}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold border transition-all ${book.userContext?.isInWishlist ? "border-[#f5c518] bg-[#f5c518]/08 text-[#7a5c00]" : "border-[#e2e0e7] bg-white text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d]"} disabled:opacity-50`}>
                <Heart size={16} fill={book.userContext?.isInWishlist ? "currentColor" : "none"} />
                {wishlistLoading ? t("book_details.actions.updating_wishlist") as string : book.userContext?.isInWishlist ? t("book_details.actions.in_wishlist") as string : t("book_details.actions.wishlist") as string}
              </motion.button>
            )}

            {/* Download button for digital */}
            {bookType === "digital" && isStudent && (book as DigitalBook).pdf_access !== "RESTRICTED" && (
              <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                onClick={() => openDigital(true)} disabled={digitalLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#e2e0e7] bg-white px-5 py-3 text-sm font-bold text-[#374151] hover:border-[#0d0d0d] hover:text-[#0d0d0d] disabled:opacity-50 transition-all">
                <Download size={15} />
                {t("book_details.actions.download_pdf") as string}
              </motion.button>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
