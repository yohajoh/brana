-- Add SUPER_ADMIN value to Role enum so DB tools can assign it directly.
ALTER TYPE "Role"
ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
