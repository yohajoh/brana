-- AlterTable: make last_updated_by_id nullable in SystemConfig
-- This allows the system to auto-seed a default config row with no actor.
ALTER TABLE "SystemConfig" ALTER COLUMN "last_updated_by_id" DROP NOT NULL;
