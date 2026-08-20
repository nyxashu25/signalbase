-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'FAILED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "DatabaseImportBatch" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL,
    "insertedContacts" INTEGER NOT NULL DEFAULT 0,
    "insertedCompanies" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "uploadedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "DatabaseImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseImportBatch_status_idx" ON "DatabaseImportBatch"("status");

-- CreateIndex
CREATE INDEX "Company_importBatchId_idx" ON "Company"("importBatchId");

-- CreateIndex
CREATE INDEX "Contact_importBatchId_idx" ON "Contact"("importBatchId");

-- AddForeignKey
ALTER TABLE "DatabaseImportBatch" ADD CONSTRAINT "DatabaseImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "SuperAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseImportBatch" ADD CONSTRAINT "DatabaseImportBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "DatabaseImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "DatabaseImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
