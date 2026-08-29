/**
 * Digital Book Controller
 */

import { Readable } from "node:stream";
import PDFDocument from "pdfkit";
import { prisma } from '../prisma.js';
import * as digitalBookService from "../services/digitalBook.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";
import { broadcastNotification } from "../services/notification.service.js";

// Module-level PDF buffer cache — keyed by book ID, expires after 1 hour.
// Cloudinary doesn't reliably honour Range requests, so we fetch the full
// file once and slice it ourselves. This gives us real 206 range responses
// without depending on CDN behaviour.
/** @type {Map<string, { buffer: Buffer, expiresAt: number }>} */
const pdfCache = new Map();

const generateFallbackPdfBuffer = (title = "Digital Book") => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(22).text(title, 100, 100);
    doc.fontSize(14).text("Brana Digital Library", 100, 150);
    doc.fontSize(12).text("The PDF document storage service is currently unreachable from this network.", 100, 180);
    doc.fontSize(10).text("Please check your internet connection or Cloudinary CDN status.", 100, 210);
    doc.end();
  });
};


export const getDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getDigitalBooks(req.query, req.user || null);
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json({ status: "success", ...result });
};

export const getAdminDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getAdminDigitalBooks(req.query);
  res.json({ status: "success", ...result });
};

export const getDigitalBook = async (req, res) => {
  const userId = req.user?.id || null;
  const book = await digitalBookService.getDigitalBookById(req.params.id, userId);
  res.set(
    "Cache-Control",
    userId ? "private, max-age=15, stale-while-revalidate=60" : "public, max-age=30, stale-while-revalidate=120",
  );
  res.json({ status: "success", data: { book } });
};

export const getDigitalBookPageData = async (req, res) => {
  const userId = req.user?.id || null;
  const data = await digitalBookService.getDigitalBookPageData(req.params.id, userId);
  res.set(
    "Cache-Control",
    userId ? "private, max-age=15, stale-while-revalidate=60" : "public, max-age=30, stale-while-revalidate=120",
  );
  res.json({ status: "success", data });
};

export const streamPdf = async (req, res, next) => {
  try {
    res.locals.noCompress = true;
    const { book, bytes, fileName, canDownload } = await digitalBookService.getPdfBytes(req.params.id, req.user);
    const wantsDownload = req.query.download === "true";

    // Disposition is ALWAYS inline unless the user explicitly requests a download
    // AND the book permits it. This prevents the browser showing a download prompt.
    const contentDisposition =
      wantsDownload && canDownload
        ? `attachment; filename="${fileName}"`
        : `inline; filename="${fileName}"`;

    if (book?.pdf_url && !book.pdf_url.startsWith("data:")) {
      // Proxy through backend — Cloudinary URL is never exposed to the client.
      //
      // Strategy: fetch the full PDF from Cloudinary once and cache it in a
      // module-level Map keyed by book ID. Then serve every range slice ourselves.
      // This means:
      //   - The Cloudinary URL is never sent to the browser
      //   - The browser only ever receives small 206 chunks
      //   - Subsequent page turns are instant (served from memory)

      const rangeHeader = req.headers.range;
      const cached = pdfCache.get(book.id);

      // ── Fetch & cache if not already in memory ────────────────────────────────
      let pdfBuffer;
      if (cached && cached.expiresAt > Date.now()) {
        pdfBuffer = cached.buffer;
      } else {
        let cloudResp;
        try {
          cloudResp = await fetch(book.pdf_url, {
            signal: AbortSignal.timeout(30_000),
          });
        } catch (err) {
          console.error("PDF upstream fetch error:", err.message);
          const fallback = await generateFallbackPdfBuffer(book?.title || "Digital Book");
          return sendBytesChunk(res, req, fallback, contentDisposition, wantsDownload);
        }

        if (!cloudResp.ok) {
          console.warn(`Upstream PDF returned ${cloudResp.status}`);
          const fallback = await generateFallbackPdfBuffer(book?.title || "Digital Book");
          return sendBytesChunk(res, req, fallback, contentDisposition, wantsDownload);
        }

        const arrayBuf = await cloudResp.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuf);
        // Cache for 1 hour — evict automatically
        pdfCache.set(book.id, { buffer: pdfBuffer, expiresAt: Date.now() + 3_600_000 });
      }

      // ── Serve from our own buffer — proper range slicing ─────────────────────
      return sendBytesChunk(res, req, pdfBuffer, contentDisposition, wantsDownload);
    }

    const pdfBytes = bytes || (book?.pdf_file ? Buffer.from(book.pdf_file) : null);
    if (!pdfBytes) {
      return res.status(404).json({ status: "error", message: "PDF data unavailable" });
    }

    return sendBytesChunk(res, req, pdfBytes, contentDisposition, wantsDownload);
  } catch (err) {
    next(err);
  }
};

const sendBytesChunk = (res, req, pdfBytes, contentDisposition, wantsDownload) => {
  const totalLength = pdfBytes.length;
  const range = req.headers.range;

  if (range && !wantsDownload) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const requestedEnd = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
    const end = Math.min(requestedEnd, totalLength - 1);

    if (start >= totalLength) {
      res.writeHead(416, { "Content-Range": `bytes */${totalLength}` });
      return res.end();
    }

    const chunk = pdfBytes.slice(start, end + 1);
    res.writeHead(206, {
      "Content-Range":      `bytes ${start}-${end}/${totalLength}`,
      "Accept-Ranges":      "bytes",
      "Content-Length":     chunk.length,
      "Content-Type":       "application/pdf",
      "Content-Disposition": contentDisposition,
      "Cache-Control":      "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.end(chunk);
  }

  // No Range header — this is PDF.js's initial probe request.
  // Respond with 200 + full metadata but NO body so PDF.js sees Accept-Ranges
  // and switches to range mode. With disableStream:true it will immediately
  // re-request with Range headers.
  res.writeHead(200, {
    "Content-Type":       "application/pdf",
    "Content-Disposition": contentDisposition,
    "Content-Length":     totalLength,
    "Accept-Ranges":      "bytes",
    "Cache-Control":      "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  return res.end(); // empty body — PDF.js reads Content-Length then uses Range requests
};

export const markAsRead = async (req, res) => {
  await digitalBookService.markDigitalBookAsRead(req.params.id, req.user.id);
  res.status(204).send();
};

export const createDigitalBook = async (req, res) => {
  const files = /** @type {any} */ (req.files || {});
  const pdfFile = files.pdf?.[0] || null;
  const imageFile = files.image?.[0] || null;
  const galleryFiles = files.images || [];
  const book = await digitalBookService.createDigitalBook(req.body, pdfFile, imageFile, galleryFiles);
  await broadcastNotification({
    message: `New digital book added: "${book.title}" is now available in the digital library.`,
    type: "NEW_BOOK",
    io: req.app.locals.io,
  });
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "CREATE",
    entityType: "DIGITAL_BOOK",
    entityId: book.id,
    description: `Created digital book "${book.title}"`,
    metadata: { pdf_access: book.pdf_access },
    req,
  });
  res.status(201).json({ status: "success", data: { book } });
};

export const updateDigitalBook = async (req, res) => {
  const files = /** @type {any} */ (req.files || {});
  const pdfFile = files.pdf?.[0] || null;
  const imageFile = files.image?.[0] || null;
  const galleryFiles = files.images || [];
  const book = await digitalBookService.updateDigitalBook(req.params.id, req.body, pdfFile, imageFile, galleryFiles);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "UPDATE",
    entityType: "DIGITAL_BOOK",
    entityId: book.id,
    description: `Updated digital book "${book.title}"`,
    metadata: { payload: req.body },
    req,
  });
  res.json({ status: "success", data: { book } });
};

export const deleteDigitalBook = async (req, res) => {
  const book = await prisma.digitalBook.findUnique({ where: { id: req.params.id }, select: { title: true } });
  await digitalBookService.deleteDigitalBook(req.params.id);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "DELETE",
    entityType: "DIGITAL_BOOK",
    entityId: req.params.id,
    description: book?.title ? `Soft-deleted digital book "${book.title}"` : "Soft-deleted digital book",
    req,
  });
  res.json({ status: "success", message: "Digital book soft-deleted successfully" });
};
