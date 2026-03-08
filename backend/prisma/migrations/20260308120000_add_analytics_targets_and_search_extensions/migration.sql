-- AlterEnum
ALTER TYPE "InventoryAlertType" ADD VALUE IF NOT EXISTS 'NEVER_RETURNED';

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "never_returned_days" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DigitalBook" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DigitalBook" ADD COLUMN IF NOT EXISTS "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "BookConditionHistory" (
  "id" UUID NOT NULL,
  "copy_id" UUID NOT NULL,
  "old_condition" "BookCondition" NOT NULL,
  "new_condition" "BookCondition" NOT NULL,
  "notes" TEXT,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookConditionHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalyticsTarget" (
  "id" UUID NOT NULL,
  "month_start" TIMESTAMP(3) NOT NULL,
  "target_rentals" INTEGER NOT NULL DEFAULT 0,
  "target_active_readers" INTEGER NOT NULL DEFAULT 0,
  "target_on_time_returns" INTEGER NOT NULL DEFAULT 0,
  "target_new_books" INTEGER NOT NULL DEFAULT 0,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BookConditionHistory_copy_id_created_at_idx" ON "BookConditionHistory"("copy_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsTarget_month_start_key" ON "AnalyticsTarget"("month_start");
CREATE INDEX IF NOT EXISTS "AnalyticsTarget_month_start_idx" ON "AnalyticsTarget"("month_start");
CREATE INDEX IF NOT EXISTS "Book_tags_idx" ON "Book" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Book_topics_idx" ON "Book" USING GIN ("topics");
CREATE INDEX IF NOT EXISTS "DigitalBook_tags_idx" ON "DigitalBook" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "DigitalBook_topics_idx" ON "DigitalBook" USING GIN ("topics");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookConditionHistory_copy_id_fkey'
  ) THEN
    ALTER TABLE "BookConditionHistory"
      ADD CONSTRAINT "BookConditionHistory_copy_id_fkey"
      FOREIGN KEY ("copy_id") REFERENCES "BookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookConditionHistory_updated_by_user_id_fkey'
  ) THEN
    ALTER TABLE "BookConditionHistory"
      ADD CONSTRAINT "BookConditionHistory_updated_by_user_id_fkey"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsTarget_updated_by_user_id_fkey'
  ) THEN
    ALTER TABLE "AnalyticsTarget"
      ADD CONSTRAINT "AnalyticsTarget_updated_by_user_id_fkey"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
