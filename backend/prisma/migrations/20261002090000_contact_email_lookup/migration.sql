-- Extension lookups match contacts by email address (Gmail, Calendar and CRM
-- pages). Store addresses lowercase so the match is exact and indexable, and
-- index the column. New imports are lowercased by databaseImportService.js.
UPDATE "Contact" SET "email" = lower("email") WHERE "email" IS NOT NULL AND "email" <> lower("email");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
