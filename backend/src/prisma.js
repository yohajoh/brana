import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Explicitly load .env from src/ regardless of where the process was started
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, ".env") });

import { PrismaPg } from "@prisma/adapter-pg";
import PrismaClientPkg from "@prisma/client";
import pg from "pg";

const { PrismaClient } = PrismaClientPkg;

const globalForPrisma = globalThis;

/**
 * Strip ?sslmode and ?connect_timeout from the connection string.
 * The pg driver's ssl object is the single source of truth for SSL config.
 * Having both causes SSL negotiation conflicts on some pg versions.
 */
function stripSslMode(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("connect_timeout");
    return u.toString();
  } catch {
    return url
      .replace(/[?&]sslmode=[^&]*/g, "")
      .replace(/[?&]connect_timeout=[^&]*/g, "");
  }
}

const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
const connectionString = stripSslMode(rawUrl);

console.log("📦 Connecting to database...");

// Reuse pool across hot-reloads in development
if (!globalForPrisma.__pgPool) {
  globalForPrisma.__pgPool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, // Neon cold-start can take ~5-8s
    ssl: { rejectUnauthorized: false },
  });

  // Log pool-level errors so they're always visible
  globalForPrisma.__pgPool.on("error", (err) => {
    console.error("❌ pg pool error:", err.message);
  });
}

const pool = globalForPrisma.__pgPool;

// Test the connection once on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
    release();
  }
});

if (!globalForPrisma.__prismaPgAdapter) {
  globalForPrisma.__prismaPgAdapter = new PrismaPg(pool);
}
const adapter = globalForPrisma.__prismaPgAdapter;

if (!globalForPrisma.__prismaClient) {
  globalForPrisma.__prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Suppress P2002 unique-constraint noise from notification deduplication.
  // This must be registered once when the client is first created.
  globalForPrisma.__prismaClient.$on("error", (e) => {
    if (
      e.message?.includes("Unique constraint") ||
      e.message?.includes("P2002")
    ) {
      return; // Expected — notification dedupe_key collision
    }
    console.error("Prisma error:", e.message);
  });
}

const prisma = globalForPrisma.__prismaClient;

export { prisma };
