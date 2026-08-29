/**
 * Digital Book Controller
 */

import { Readable } from "node:stream";
import PDFDocument from "pdfkit";
import { prisma } from '../prisma.js';
import * as digitalBookService from "../services/digitalBook.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";
import { broadcastNotification } from "../services/notification.service.js";

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
    const contentDisposition =
      wantsDownload && canDownload ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`;

    if (book?.pdf_url && !book.pdf_url.startsWith("data:")) {
      // Proxy the PDF through the backend — never expose the Cloudinary URL to the client.
      // Forward any Range header so PDF.js range-streaming works correctly.
      const fetchHeaders = {};
      if (req.headers.range) fetchHeaders["range"] = req.headers.range;

      let upstreamResp;
      try {
        upstreamResp = await fetch(book.pdf_url, {
          headers: fetchHeaders,
          signal: AbortSignal.timeout(15_000), // 15 s — enough for Cloudinary cold start
        });
      } catch (fetchErr) {
        console.error("Upstream PDF fetch error:", fetchErr.message);
        const fallback = await generateFallbackPdfBuffer(book?.title || "Digital Book");
        return sendBytesChunk(res, req, fallback, contentDisposition, wantsDownload);
      }

      if (!upstreamResp.ok && upstreamResp.status !== 206) {
        console.warn(`Upstream PDF returned ${upstreamResp.status} for ${book.pdf_url}`);
        const fallback = await generateFallbackPdfBuffer(book?.title || "Digital Book");
        return sendBytesChunk(res, req, fallback, contentDisposition, wantsDownload);
      }

      // Forward status + relevant headers, then pipe the body straight through
      res.status(upstreamResp.status);
      for (const h of ["content-range", "accept-ranges", "content-length", "content-type"]) {
        const val = upstreamResp.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      res.setHeader("Content-Disposition", contentDisposition);
      res.setHeader("Cache-Control", "private, no-store"); // prevent browser caching the raw PDF

      if (upstreamResp.body) {
        const stream = Readable.fromWeb(upstreamResp.body);
        stream.on("error", (err) => {
          console.error("PDF pipe error:", err);
          if (!res.headersSent) res.status(500).end();
        });
        res.on("close", () => stream.destroy());
        return stream.pipe(res);
      }
      return res.end();
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
      res.writeHead(416, {
        "Content-Range": `bytes */${totalLength}`,
      });
      return res.end();
    }

    const chunk = pdfBytes.slice(start, end + 1);
    const chunkSize = chunk.length;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, max-age=3600",
    });
    return res.end(chunk);
  }

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDisposition,
    "Content-Length": totalLength,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  res.send(pdfBytes);
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
