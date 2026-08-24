-- Chrome-extension sourcing pipeline: personal API keys, normalized
-- LinkedIn identity on Contact (with backfill), and the two sourcing
-- queues (MissingPerson = "Pending peoples", LostChild = "Childs found").

-- CreateEnum
CREATE TYPE "MissingPersonStatus" AS ENUM ('PENDING', 'ADDED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "LostChildStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESOLVE_MISSING_PERSON';
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESOLVE_LOST_CHILD';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "linkedinSlug" TEXT;

-- Backfill: extract the /in/<slug> path segment from existing linkedinUrl
-- values — lowercased, query/fragment/trailing-slash stripped, matching
-- utils/linkedin.js `linkedinSlugFromUrl`. Rows whose URL isn't a
-- recognizable profile link stay NULL (they simply won't match extension
-- visits, same as having no URL at all).
UPDATE "Contact"
SET "linkedinSlug" = lower(
  regexp_replace(
    regexp_replace("linkedinUrl", '^https?://[^/]*linkedin\.com/in/', '', 'i'),
    '[/?#].*$', ''
  )
)
WHERE "linkedinUrl" ~* '^https?://[^/]*linkedin\.com/in/[^/?#]+';

-- CreateIndex
CREATE INDEX "Contact_linkedinSlug_idx" ON "Contact"("linkedinSlug");

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MissingPerson" (
    "id" TEXT NOT NULL,
    "linkedinSlug" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "name" TEXT,
    "jobTitle" TEXT,
    "location" TEXT,
    "companyName" TEXT,
    "domText" TEXT,
    "status" "MissingPersonStatus" NOT NULL DEFAULT 'PENDING',
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "firstReportedById" TEXT,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissingPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissingPerson_linkedinSlug_key" ON "MissingPerson"("linkedinSlug");

-- CreateIndex
CREATE INDEX "MissingPerson_status_lastReportedAt_idx" ON "MissingPerson"("status", "lastReportedAt");

-- CreateTable
CREATE TABLE "LostChild" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "linkedinSlug" TEXT NOT NULL,
    "oldTitle" TEXT,
    "newTitle" TEXT NOT NULL,
    "observedCompanyName" TEXT,
    "domText" TEXT,
    "status" "LostChildStatus" NOT NULL DEFAULT 'PENDING',
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "firstReportedById" TEXT,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostChild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LostChild_status_lastReportedAt_idx" ON "LostChild"("status", "lastReportedAt");

-- CreateIndex
CREATE INDEX "LostChild_contactId_idx" ON "LostChild"("contactId");

-- AddForeignKey
ALTER TABLE "LostChild" ADD CONSTRAINT "LostChild_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
