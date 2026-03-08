-- Enable trigram search support for fast contains/ILIKE lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Notification deduplication key for reminder-style events
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;

-- Trigram indexes for catalog search
CREATE INDEX IF NOT EXISTS "Book_title_trgm_idx"
  ON "Book" USING GIN (LOWER(title) gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "DigitalBook_title_trgm_idx"
  ON "DigitalBook" USING GIN (LOWER(title) gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "Author_name_trgm_idx"
  ON "Author" USING GIN (LOWER(name) gin_trgm_ops);

-- Partial indexes for hot filters
CREATE INDEX IF NOT EXISTS "Rental_due_date_borrowed_idx"
  ON "Rental"(due_date)
  WHERE status = 'BORROWED';

CREATE INDEX IF NOT EXISTS "Reservation_book_id_queue_position_queued_idx"
  ON "Reservation"(book_id, queue_position)
  WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS "Notification_unread_user_created_idx"
  ON "Notification"(user_id, created_at)
  WHERE is_read = false;

-- Uniqueness for idempotent notification writes when dedupe_key is provided
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_user_id_dedupe_key_key"
  ON "Notification"(user_id, dedupe_key);
