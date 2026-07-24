/**
 * Public Stats Route — no authentication required
 * Returns safe aggregate counts for the landing page.
 * BASE: /api/public/stats
 */

import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [
      totalPhysicalBooks,
      totalDigitalBooks,
      totalCategories,
      totalUsers,
      totalRentals,
    ] = await Promise.all([
      prisma.book.count({ where: { deleted_at: null } }),
      prisma.digitalBook.count({ where: { deleted_at: null } }),
      prisma.category.count(),
      prisma.user.count({ where: { is_confirmed: true, is_blocked: false } }),
      prisma.rental.count(),
    ]);

    res.json({
      status: "success",
      data: {
        totalBooks: totalPhysicalBooks + totalDigitalBooks,
        totalPhysicalBooks,
        totalDigitalBooks,
        totalCategories,
        totalStudents: totalUsers,
        totalRentals,
      },
    });
  } catch {
    res.status(500).json({ status: "error", message: "Could not fetch public stats" });
  }
});

export default router;
