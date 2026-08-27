-- Workspace branding (logo + motto, free on every plan) and per-teammate
-- credit attribution for the team audit.

-- AlterTable: branding
ALTER TABLE "Workspace" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "motto" TEXT;

-- AlterTable: who spent the credits
ALTER TABLE "CreditLedgerEntry" ADD COLUMN "spentById" TEXT;

-- Backfill: reveals are the one historical spend whose actor we can recover
-- cleanly — EmailReveal carries revealedById, and the matching ledger row is
-- keyed by the same (workspaceId, contactId). (Company-view ledger rows don't
-- store companyId, so those stay unattributed; every spend from here on is
-- attributed at write time.)
UPDATE "CreditLedgerEntry" c
SET "spentById" = r."revealedById"
FROM "EmailReveal" r
WHERE c."reason" IN ('EMAIL_REVEAL', 'EXTENSION_REVEAL')
  AND c."contactId" IS NOT NULL
  AND r."workspaceId" = c."workspaceId"
  AND r."contactId" = c."contactId";

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_workspaceId_spentById_idx" ON "CreditLedgerEntry"("workspaceId", "spentById");
