/*
  Warnings:

  - A unique constraint covering the columns `[student_id]` on the table `PendingSignup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PendingSignup" ADD COLUMN     "department" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "student_id" TEXT,
ADD COLUMN     "year" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PendingSignup_student_id_key" ON "PendingSignup"("student_id");
