/**
 * Public Stats Route — no authentication required
 * Returns safe aggregate counts for the landing page.
 * BASE: /api/public/stats
 */

import { Router } from "express";
import * as statsController from "../controllers/stats.controller.js";

const router = Router();

router.get("/", statsController.getPublicStats);

export default router;
