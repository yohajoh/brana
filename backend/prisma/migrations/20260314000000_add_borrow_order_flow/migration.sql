-- Add borrow mode enum and delivery details to rentals, then add borrow orders table.
CREATE TYPE "BorrowMode" AS ENUM ('NORMAL', 'ORDER');

ALTER TABLE "Rental"
ADD COLUMN "borrow_mode" "BorrowMode" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "delivery_building_block" TEXT,
ADD COLUMN "delivery_dorm_number" TEXT,
ADD COLUMN "delivery_available_time" TEXT;

CREATE TABLE "BorrowOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rental_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "building_block_number" TEXT NOT NULL,
  "dorm_number" TEXT NOT NULL,
  "available_time" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BorrowOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BorrowOrder_rental_id_key" ON "BorrowOrder"("rental_id");
CREATE INDEX "BorrowOrder_user_id_created_at_idx" ON "BorrowOrder"("user_id", "created_at");
CREATE INDEX "BorrowOrder_created_at_idx" ON "BorrowOrder"("created_at");

ALTER TABLE "BorrowOrder"
ADD CONSTRAINT "BorrowOrder_rental_id_fkey"
FOREIGN KEY ("rental_id") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BorrowOrder"
ADD CONSTRAINT "BorrowOrder_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
