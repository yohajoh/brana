import { prisma } from '../prisma.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (v) => (v === null || v === undefined ? '' : String(v));
const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'UTC', timeZoneName: 'short',
  });
};
const fmtDecimal = (v) => (v != null ? Number(v).toFixed(2) : '0.00');

// ─── DATA FETCHERS ────────────────────────────────────────────────────────────

const fetchRentals = async () => {
  const data = await prisma.rental.findMany({
    include: {
      user: {
        select: {
          name: true, email: true, student_id: true,
          year: true, department: true, phone: true, is_blocked: true,
        },
      },
      physical_book: {
        select: {
          title: true, isbn: true, pages: true, rental_price: true,
          publication_year: true, language: true,
          author: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
      copy: { select: { copy_code: true, condition: true } },
      payment: { select: { tx_ref: true, amount: true, method: true, status: true, paid_at: true } },
    },
    orderBy: { loan_date: 'desc' },
    take: 10000,
  });

  const now = new Date();
  return data.map((r) => {
    const daysOverdue =
      r.status === 'BORROWED' && new Date(r.due_date) < now
        ? Math.ceil((now - new Date(r.due_date)) / 86400000)
        : 0;
    return {
      rental_id: r.id,
      status: r.status,
      student_name: r.user?.name ?? '',
      student_email: r.user?.email ?? '',
      student_id: r.user?.student_id ?? '',
      student_year: r.user?.year ?? '',
      student_department: r.user?.department ?? '',
      student_phone: r.user?.phone ?? '',
      student_blocked: r.user?.is_blocked ? 'Yes' : 'No',
      book_title: r.physical_book?.title ?? '[Deleted Book]',
      book_isbn: r.physical_book?.isbn ?? '',
      book_author: r.physical_book?.author?.name ?? '',
      book_category: r.physical_book?.category?.name ?? '',
      book_pages: r.physical_book?.pages ?? '',
      book_language: r.physical_book?.language ?? '',
      book_publication_year: r.physical_book?.publication_year ?? '',
      rental_price_etb: fmtDecimal(r.physical_book?.rental_price),
      copy_code: r.copy?.copy_code ?? '',
      copy_condition: r.copy?.condition ?? '',
      loan_date: fmtDate(r.loan_date),
      due_date: fmtDate(r.due_date),
      return_date: fmtDate(r.return_date),
      days_overdue: daysOverdue,
      fine_etb: fmtDecimal(r.fine),
      payment_ref: r.payment?.tx_ref ?? '',
      payment_amount_etb: r.payment ? fmtDecimal(r.payment.amount) : '',
      payment_method: r.payment?.method ?? '',
      payment_status: r.payment?.status ?? '',
      payment_date: fmtDate(r.payment?.paid_at),
    };
  });
};

const fetchOverdue = async () => {
  const now = new Date();
  const data = await prisma.rental.findMany({
    where: { status: 'BORROWED', due_date: { lt: now } },
    include: {
      user: { select: { name: true, email: true, student_id: true, year: true, department: true, phone: true } },
      physical_book: {
        select: {
          title: true, isbn: true,
          author: { select: { name: true } },
          category: { select: { name: true } },
          rental_price: true,
        },
      },
      copy: { select: { copy_code: true, condition: true } },
    },
    orderBy: { due_date: 'asc' },
    take: 10000,
  });

  const config = await prisma.systemConfig.findFirst({ orderBy: { id: 'desc' }, select: { daily_fine: true } });
  const dailyFine = Number(config?.daily_fine ?? 0);

  return data.map((r) => {
    const daysOverdue = Math.ceil((now - new Date(r.due_date)) / 86400000);
    const estimatedFine = (daysOverdue * dailyFine).toFixed(2);
    return {
      rental_id: r.id,
      student_name: r.user?.name ?? '',
      student_email: r.user?.email ?? '',
      student_id: r.user?.student_id ?? '',
      student_year: r.user?.year ?? '',
      student_department: r.user?.department ?? '',
      student_phone: r.user?.phone ?? '',
      book_title: r.physical_book?.title ?? '[Deleted Book]',
      book_isbn: r.physical_book?.isbn ?? '',
      book_author: r.physical_book?.author?.name ?? '',
      book_category: r.physical_book?.category?.name ?? '',
      copy_code: r.copy?.copy_code ?? '',
      copy_condition: r.copy?.condition ?? '',
      loan_date: fmtDate(r.loan_date),
      due_date: fmtDate(r.due_date),
      days_overdue: daysOverdue,
      severity: daysOverdue >= 30 ? 'CRITICAL' : daysOverdue >= 14 ? 'HIGH' : daysOverdue >= 7 ? 'MEDIUM' : 'LOW',
      existing_fine_etb: fmtDecimal(r.fine),
      estimated_total_fine_etb: estimatedFine,
      daily_fine_rate_etb: dailyFine.toFixed(2),
    };
  });
};

const fetchUsers = async () => {
  const data = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true, name: true, email: true, student_id: true,
      year: true, department: true, phone: true,
      is_confirmed: true, is_blocked: true, created_at: true,
      rentals: {
        select: { status: true, fine: true, return_date: true, due_date: true },
      },
      reservations: { select: { status: true } },
      reviews: { select: { id: true } },
      wishlists: { select: { id: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 10000,
  });

  return data.map((u) => {
    const totalRentals = u.rentals.length;
    const activeRentals = u.rentals.filter((r) => r.status === 'BORROWED' || r.status === 'PENDING').length;
    const returnedRentals = u.rentals.filter((r) => r.status === 'RETURNED' || r.status === 'COMPLETED').length;
    const totalFines = u.rentals.reduce((s, r) => s + Number(r.fine ?? 0), 0);
    const overdueRentals = u.rentals.filter(
      (r) => r.status === 'BORROWED' && new Date(r.due_date) < new Date(),
    ).length;
    const returned = u.rentals.filter((r) => r.return_date && r.due_date);
    const onTime = returned.filter((r) => new Date(r.return_date) <= new Date(r.due_date)).length;
    const onTimeRate = returned.length > 0 ? ((onTime / returned.length) * 100).toFixed(1) + '%' : 'N/A';
    return {
      user_id: u.id,
      name: u.name,
      email: u.email,
      student_id: u.student_id ?? '',
      year: u.year ?? '',
      department: u.department ?? '',
      phone: u.phone ?? '',
      account_status: u.is_blocked ? 'Blocked' : u.is_confirmed ? 'Active' : 'Unconfirmed',
      is_confirmed: u.is_confirmed ? 'Yes' : 'No',
      is_blocked: u.is_blocked ? 'Yes' : 'No',
      joined_at: fmtDate(u.created_at),
      total_rentals: totalRentals,
      active_rentals: activeRentals,
      returned_rentals: returnedRentals,
      overdue_rentals: overdueRentals,
      on_time_return_rate: onTimeRate,
      total_fines_etb: totalFines.toFixed(2),
      total_reservations: u.reservations.length,
      active_reservations: u.reservations.filter((r) => r.status === 'QUEUED' || r.status === 'NOTIFIED').length,
      total_reviews: u.reviews.length,
      wishlist_items: u.wishlists.length,
    };
  });
};

const fetchInventory = async () => {
  const data = await prisma.book.findMany({
    where: { deleted_at: null },
    select: {
      id: true, title: true, copies: true, available: true,
      isbn: true, pages: true, language: true, publication_year: true,
      rental_price: true, publisher: true, tags: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
      copies_detail: {
        where: { deleted_at: null },
        select: { condition: true, is_available: true },
      },
      reviews: { select: { rating: true } },
      rentals: { select: { id: true, status: true } },
      reservations: { select: { status: true } },
    },
    orderBy: { title: 'asc' },
    take: 10000,
  });

  return data.map((b) => {
    const avgRating = b.reviews.length > 0
      ? (b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length).toFixed(1)
      : 'No reviews';
    const conditions = b.copies_detail.reduce((acc, c) => {
      acc[c.condition] = (acc[c.condition] ?? 0) + 1;
      return acc;
    }, {});
    const activeReservations = b.reservations.filter((r) => r.status === 'QUEUED' || r.status === 'NOTIFIED').length;
    const totalBorrows = b.rentals.length;
    return {
      book_id: b.id,
      title: b.title,
      author: b.author?.name ?? '',
      category: b.category?.name ?? '',
      isbn: b.isbn ?? '',
      publisher: b.publisher ?? '',
      publication_year: b.publication_year ?? '',
      language: b.language ?? '',
      pages: b.pages ?? '',
      tags: b.tags?.join(', ') ?? '',
      rental_price_etb: fmtDecimal(b.rental_price),
      total_copies: b.copies,
      available_copies: b.available,
      borrowed_copies: b.copies - b.available,
      availability_rate:
        b.copies > 0 ? ((b.available / b.copies) * 100).toFixed(1) + '%' : '0%',
      stock_status: b.available === 0 ? 'OUT OF STOCK' : b.available <= 2 ? 'LOW STOCK' : 'IN STOCK',
      copies_new: conditions['NEW'] ?? 0,
      copies_good: conditions['GOOD'] ?? 0,
      copies_worn: conditions['WORN'] ?? 0,
      copies_damaged: conditions['DAMAGED'] ?? 0,
      copies_lost: conditions['LOST'] ?? 0,
      total_borrows_all_time: totalBorrows,
      active_reservations: activeReservations,
      average_rating: avgRating,
      total_reviews: b.reviews.length,
    };
  });
};

const fetchReservations = async () => {
  const data = await prisma.reservation.findMany({
    include: {
      user: { select: { name: true, email: true, student_id: true, year: true, department: true } },
      book: {
        select: {
          title: true, isbn: true,
          author: { select: { name: true } },
          category: { select: { name: true } },
          available: true, copies: true,
        },
      },
    },
    orderBy: { reserved_at: 'desc' },
    take: 10000,
  });

  return data.map((r) => {
    const waitDays = r.notified_at
      ? Math.ceil((new Date(r.notified_at) - new Date(r.reserved_at)) / 86400000)
      : r.fulfilled_at
      ? Math.ceil((new Date(r.fulfilled_at) - new Date(r.reserved_at)) / 86400000)
      : Math.ceil((new Date() - new Date(r.reserved_at)) / 86400000);
    return {
      reservation_id: r.id,
      status: r.status,
      student_name: r.user?.name ?? '',
      student_email: r.user?.email ?? '',
      student_id: r.user?.student_id ?? '',
      student_year: r.user?.year ?? '',
      student_department: r.user?.department ?? '',
      book_title: r.book?.title ?? '',
      book_isbn: r.book?.isbn ?? '',
      book_author: r.book?.author?.name ?? '',
      book_category: r.book?.category?.name ?? '',
      book_available_copies: r.book?.available ?? 0,
      book_total_copies: r.book?.copies ?? 0,
      queue_position: r.queue_position,
      reserved_at: fmtDate(r.reserved_at),
      notified_at: fmtDate(r.notified_at),
      expires_at: fmtDate(r.expires_at),
      fulfilled_at: fmtDate(r.fulfilled_at),
      cancelled_at: fmtDate(r.cancelled_at),
      wait_days: waitDays,
    };
  });
};

const fetchWishlistProcurement = async () => {
  const [wishlistGroupPhysical, wishlistGroupDigital] = await Promise.all([
    prisma.wishlist.groupBy({
      by: ['physical_book_id'],
      where: { physical_book_id: { not: null } },
      _count: { physical_book_id: true },
      orderBy: { _count: { physical_book_id: 'desc' } },
      take: 1000,
    }),
    prisma.wishlist.groupBy({
      by: ['digital_book_id'],
      where: { digital_book_id: { not: null } },
      _count: { digital_book_id: true },
      orderBy: { _count: { digital_book_id: 'desc' } },
      take: 1000,
    }),
  ]);

  const physicalIds = wishlistGroupPhysical
    .map((w) => w.physical_book_id)
    .filter(Boolean);

  const physicalBooks = await prisma.book.findMany({
    where: { id: { in: /** @type {any} */ (physicalIds) }, deleted_at: null },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
      _count: { select: { reservations: true } },
    },
  });
  const physicalMap = new Map(physicalBooks.map((b) => [b.id, b]));

  const physicalRows = wishlistGroupPhysical
    .map((w) => {
      if (!w.physical_book_id) return null;
      const b = physicalMap.get(w.physical_book_id);
      if (!b) return null;
      const wishlistCount = w._count.physical_book_id;
      const activeReservations = b._count.reservations;
      const available = b.available;
      const totalCopies = b.copies;
      const totalDemand = wishlistCount + activeReservations;

      let urgency = 'BALANCED';
      let recommendation = 'Stock meets demand';
      let recommendedOrderQty = 0;

      if (available === 0 && wishlistCount >= 1) {
        urgency = 'URGENT_PURCHASE';
        recommendation = 'Out of stock & wishlisted. Priority purchase needed.';
        recommendedOrderQty = Math.max(3, totalDemand + 2);
      } else if (available <= 2 && wishlistCount >= 1) {
        urgency = 'RESTOCK_NEEDED';
        recommendation = 'Low stock with wishlist demand. Restock recommended.';
        recommendedOrderQty = Math.max(2, totalDemand - available);
      } else if (wishlistCount >= 3) {
        urgency = 'HIGH_DEMAND';
        recommendation = 'High student wishlist demand. Consider expanding copies.';
        recommendedOrderQty = Math.max(2, wishlistCount - available);
      }

      return {
        book_title: b.title,
        book_type: 'PHYSICAL',
        author: b.author?.name ?? '',
        category: b.category?.name ?? '',
        wishlist_count: wishlistCount,
        active_reservations: activeReservations,
        available_copies: available,
        total_copies: totalCopies,
        decision_urgency: urgency,
        procurement_recommendation: recommendation,
        recommended_purchase_qty: recommendedOrderQty,
      };
    })
    .filter(Boolean);

  const digitalIds = wishlistGroupDigital
    .map((w) => w.digital_book_id)
    .filter(Boolean);

  const digitalBooks = await prisma.digitalBook.findMany({
    where: { id: { in: /** @type {any} */ (digitalIds) }, deleted_at: null },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  const digitalMap = new Map(digitalBooks.map((b) => [b.id, b]));

  const digitalRows = wishlistGroupDigital
    .map((w) => {
      if (!w.digital_book_id) return null;
      const b = digitalMap.get(w.digital_book_id);
      if (!b) return null;
      const wishlistCount = w._count.digital_book_id;
      return {
        book_title: b.title,
        book_type: 'DIGITAL',
        author: b.author?.name ?? '',
        category: b.category?.name ?? '',
        wishlist_count: wishlistCount,
        active_reservations: 0,
        available_copies: 'UNLIMITED',
        total_copies: 'UNLIMITED',
        decision_urgency: wishlistCount >= 3 ? 'HIGH_DEMAND' : 'BALANCED',
        procurement_recommendation:
          b.pdf_access === 'RESTRICTED'
            ? 'High wishlist interest — consider granting full PDF access'
            : 'Active student interest — promote in digital library',
        recommended_purchase_qty: 0,
      };
    })
    .filter(Boolean);

  return [...physicalRows, ...digitalRows];
};

export const getReportData = async (type) => {
  if (type === 'rentals') return fetchRentals();
  if (type === 'overdue') return fetchOverdue();
  if (type === 'users') return fetchUsers();
  if (type === 'inventory') return fetchInventory();
  if (type === 'reservations') return fetchReservations();
  if (type === 'wishlist-procurement' || type === 'wishlist') return fetchWishlistProcurement();
  throw new Error('Unsupported report type');
};

// ─── CSV ──────────────────────────────────────────────────────────────────────

const buildCsv = (rows) => {
  if (!rows.length) return 'No data';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = fmt(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  return lines.join('\n');
};

// ─── EXCEL ────────────────────────────────────────────────────────────────────

const REPORT_META = {
  rentals:                { label: 'Rentals Report',                color: '1E3A5F' },
  overdue:                { label: 'Overdue Report',                 color: 'B91C1C' },
  users:                  { label: 'Users Report',                   color: '065F46' },
  inventory:              { label: 'Inventory Report',               color: '4C1D95' },
  reservations:           { label: 'Reservations Report',            color: '92400E' },
  'wishlist-procurement': { label: 'Wishlist Procurement Report', color: 'BE185D' },
  wishlist:               { label: 'Wishlist Procurement Report', color: 'BE185D' },
};

const buildExcel = async (type, rows) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Brana Library System';
  wb.created = new Date();

  const meta = REPORT_META[type] || { label: `${type} Report`, color: '1E3A5F' };
  const ws = wb.addWorksheet(meta.label, { views: [{ state: 'frozen', ySplit: 3 }] });

  if (!rows.length) {
    ws.addRow(['No data available']);
    return wb.xlsx.writeBuffer();
  }

  const headers = Object.keys(rows[0]);
  const colCount = headers.length;

  // Title row
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell('A1');
  titleCell.value = `🏛️  BRANA LIBRARY MANAGEMENT SYSTEM — ${meta.label.toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${meta.color}` } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Subtitle row
  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell('A2');
  subCell.value = `Generated: ${new Date().toUTCString()}  |  Total Records: ${rows.length.toLocaleString()}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  // Header row
  const headerRow = ws.addRow(headers.map((h) => h.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())));
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${meta.color}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FF8EADCC' } },
    };
  });

  // Data rows
  rows.forEach((row, idx) => {
    const dr = ws.addRow(headers.map((h) => {
      const v = row[h];
      if (v === '' || v === null || v === undefined) return '';
      if (typeof v === 'number') return v;
      const n = Number(v);
      if (!isNaN(n) && String(v).trim() !== '') return n;
      return String(v);
    }));
    dr.height = 18;
    const isEven = idx % 2 === 0;
    dr.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF7FAFC' },
      };
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1A202C' } };
      cell.alignment = { vertical: 'middle', horizontal: typeof headers[colNumber - 1] !== 'string' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
  });

  // Auto column widths
  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    const header = h.replace(/_/g, ' ');
    const maxDataLen = Math.min(40, Math.max(...rows.map((r) => fmt(r[h]).length)));
    col.width = Math.max(header.length + 2, maxDataLen + 2, 12);
  });

  // Freeze and autofilter
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: colCount } };

  return wb.xlsx.writeBuffer();
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

// System Unicode fonts – support Latin + Ethiopic (Amharic / Tigrinya) script
const FONT_REGULAR  = join(__dirname, '../assets/fonts/DroidSans.ttf');
const FONT_BOLD     = join(__dirname, '../assets/fonts/DroidSans-Bold.ttf');
const FONT_ETH_REG  = join(__dirname, '../assets/fonts/DroidSansEthiopic-Regular.ttf');
const FONT_ETH_BOLD = join(__dirname, '../assets/fonts/DroidSansEthiopic-Bold.ttf');

/** Returns true if the string contains any Ethiopic Unicode codepoints. */
const hasEthiopic = (s) =>
  /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB01-\uAB2F]/.test(String(s ?? ''));

const buildPdf = (type, rows) =>
  new Promise((resolve, reject) => {
    const meta = REPORT_META[type] || { label: `${type} Report`, color: '1E3A5F' };
    const hexColor = `#${meta.color}`;

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true });

    // Register Unicode-capable fonts
    doc.registerFont('Reg',     FONT_REGULAR);
    doc.registerFont('Bold',    FONT_BOLD);
    doc.registerFont('EthReg',  FONT_ETH_REG);
    doc.registerFont('EthBold', FONT_ETH_BOLD);

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (!rows.length) {
      doc.font('Reg').fontSize(14).text('No data available.', 50, 50);
      doc.end();
      return;
    }

    const allHeaders = Object.keys(rows[0]);
    const pageW = doc.page.width - 60;
    const FONT_SIZE = 7;
    const ROW_H = 16;
    const MIN_COL_W = 50;
    const COLS_PER_BAND = Math.max(1, Math.floor(pageW / MIN_COL_W));
    const bands = [];
    for (let i = 0; i < allHeaders.length; i += COLS_PER_BAND) {
      bands.push(allHeaders.slice(i, i + COLS_PER_BAND));
    }

    const pickFont = (text, bold) =>
      hasEthiopic(text) ? (bold ? 'EthBold' : 'EthReg') : (bold ? 'Bold' : 'Reg');

    const drawBanner = (bandIdx, totalBands) => {
      doc.rect(30, 20, pageW, 46).fill(hexColor);
      const title = `BRANA LIBRARY — ${meta.label.toUpperCase()}`;
      doc.font(pickFont(title, true)).fillColor('#FFFFFF').fontSize(13)
        .text(title, 42, 26, { width: pageW - 20, lineBreak: false });
      const bandNote = totalBands > 1 ? `  ·  Column Group ${bandIdx + 1} of ${totalBands}` : '';
      doc.font('Reg').fontSize(7)
        .text(
          `Generated: ${new Date().toUTCString()}  |  Records: ${rows.length.toLocaleString()}${bandNote}`,
          42, 46, { width: pageW - 20, lineBreak: false },
        );
    };

    const drawColHeaders = (bandHeaders, y) => {
      const colW = pageW / bandHeaders.length;
      doc.rect(30, y, pageW, ROW_H).fill(hexColor);
      bandHeaders.forEach((h, i) => {
        const label = h.replace(/_/g, ' ').toUpperCase();
        doc.font(pickFont(label, true)).fillColor('#FFFFFF').fontSize(FONT_SIZE)
          .text(label, 32 + i * colW, y + 4, { width: colW - 4, lineBreak: false });
      });
    };

    const getRowHeight = (bandHeaders, row) => {
      const colW = pageW / bandHeaders.length;
      let maxH = ROW_H;
      bandHeaders.forEach((h) => {
        const raw = fmt(row[h]);
        doc.font(pickFont(raw, false)).fontSize(FONT_SIZE);
        const textH = doc.heightOfString(raw, { width: colW - 6 });
        const cellH = textH + 8; // padding (4pt top, 4pt bottom)
        if (cellH > maxH) {
          maxH = cellH;
        }
      });
      return maxH;
    };

    const drawDataRow = (bandHeaders, row, y, rowH, rowIdx) => {
      const colW = pageW / bandHeaders.length;
      const bg = rowIdx % 2 === 0 ? '#FFFFFF' : '#F7FAFC';
      doc.rect(30, y, pageW, rowH).fill(bg);
      bandHeaders.forEach((h, i) => {
        const raw = fmt(row[h]);
        doc.font(pickFont(raw, false)).fillColor('#1A202C').fontSize(FONT_SIZE)
          .text(raw, 33 + i * colW, y + 4, { width: colW - 6, align: 'left' });
      });
      doc.moveTo(30, y + rowH).lineTo(30 + pageW, y + rowH)
        .strokeColor('#E2E8F0').lineWidth(0.3).stroke();
    };

    const DATA_START = 76;

    bands.forEach((bandHeaders, bandIdx) => {
      if (bandIdx > 0) doc.addPage();

      drawBanner(bandIdx, bands.length);
      drawColHeaders(bandHeaders, DATA_START);

      let y = DATA_START + ROW_H;

      rows.forEach((row, rowIdx) => {
        const rowH = getRowHeight(bandHeaders, row);
        if (y + rowH > doc.page.height - 30) {
          doc.addPage();
          doc.rect(30, 20, pageW, 22).fill(hexColor);
          doc.font('Bold').fillColor('#FFFFFF').fontSize(8)
            .text(
              `${meta.label.toUpperCase()}${bands.length > 1 ? ` — Group ${bandIdx + 1}/${bands.length}` : ''} (continued)`,
              38, 26, { width: pageW - 20, lineBreak: false },
            );
          drawColHeaders(bandHeaders, 46);
          y = 46 + ROW_H;
        }
        drawDataRow(bandHeaders, row, y, rowH, rowIdx);
        y += rowH;
      });
    });

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font('Reg').fillColor('#9CA3AF').fontSize(6.5)
        .text(
          `Page ${i + 1} of ${range.count}  ·  Brana Library Management System  ·  Confidential`,
          30, doc.page.height - 22, { width: pageW, align: 'center', lineBreak: false },
        );
    }

    doc.end();
  });


// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────

export const buildReport = async (type, format = 'json') => {
  const rows = await getReportData(type);

  if (format === 'json') return { contentType: 'application/json', body: { rows } };

  // For file exports, return a clear error payload when there is no data
  // instead of generating an empty/blank file.
  if (rows.length === 0) {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    throw new Error(`No ${label} data found. Nothing to export.`);
  }

  if (format === 'csv') {
    return {
      contentType: 'text/csv; charset=utf-8',
      body: '\uFEFF' + buildCsv(rows), // UTF-8 BOM so Excel opens correctly
      extension: 'csv',
    };
  }

  if (format === 'excel') {
    const buffer = await buildExcel(type, rows);
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: buffer,
      extension: 'xlsx',
    };
  }

  if (format === 'pdf') {
    const buffer = await buildPdf(type, rows);
    return { contentType: 'application/pdf', body: buffer, extension: 'pdf' };
  }

  throw new Error('Unsupported format');
};
