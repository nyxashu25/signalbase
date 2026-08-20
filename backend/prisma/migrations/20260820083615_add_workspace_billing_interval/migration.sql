-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'QUARTER', 'YEAR');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH';
