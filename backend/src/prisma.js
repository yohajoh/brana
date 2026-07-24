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

// Strip ?sslmode=... from the connection string so the explicit ssl object
// in pg.Pool config is the single source of truth — avoids SSL negotiation
// conflicts between the connection-string parameter and the driver config.
function stripSslMode(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("connect_timeout");
    return u.toString();
  } catch {
    return url.replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]connect_timeout=[^&]*/g, "");
  }
}

// Prefer the pooler URL for local development — more reliable with pgbouncer
const rawUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
const connectionString = stripSslMode(rawUrl);

console.log("📦 Connecting to database...");

const pool = new pg.Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
    // Explicitly request SSL/TLS — required for Neon hosted Postgres
  },
});

// Test the connection once on startup so errors are visible immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
    release();
  }
});

const adapter = globalForPrisma.__prismaPgAdapter || new PrismaPg(pool);

const prisma =
  globalForPrisma.__prismaClient ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaPgAdapter = adapter;
  globalForPrisma.__prismaClient = prisma;
}

export { prisma };
