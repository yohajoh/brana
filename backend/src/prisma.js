import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis;

const adapter = globalForPrisma.__prismaPgAdapter || new PrismaPg({ connectionString });
const prisma = globalForPrisma.__prismaClient || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaPgAdapter = adapter;
  globalForPrisma.__prismaClient = prisma;
}

export { prisma };
