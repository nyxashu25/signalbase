ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather in every account that already exists (password or Google) so
-- nobody who could already log in gets locked out by the new verification
-- gate in authService.login. Only accounts created after this migration
-- start unverified.
UPDATE "User" SET "emailVerified" = true;
