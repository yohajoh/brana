-- Add explicit super admin marker to support single super-admin governance.
ALTER TABLE "User"
ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap existing records: the oldest admin becomes the initial super admin.
WITH first_admin AS (
  SELECT id
  FROM "User"
  WHERE role = 'ADMIN'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE "User"
SET is_super_admin = true
WHERE id IN (SELECT id FROM first_admin);
