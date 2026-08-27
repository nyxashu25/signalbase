-- Per-user credit core (Phase A of the per-user credits / block-billing
-- rebuild). Purely additive — the balance move itself (Redis + baseline
-- ledger rows) runs in scripts/migrate-per-user-credits.mjs, not here.

-- New enum values
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'OWNER_BONUS';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'WELCOME_GIFT';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'BALANCE_MIGRATION';

CREATE TYPE "SeatType" AS ENUM ('PAID', 'FREE', 'PENDING');

-- Workspace: block billing + lifecycle
ALTER TABLE "Workspace" ADD COLUMN "blocks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workspace" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- User: soft delete + monthly-grant cursor
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastMonthlyGrantAt" TIMESTAMP(3);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_lastMonthlyGrantAt_idx" ON "User"("lastMonthlyGrantAt");

-- Membership: seat occupancy + one-time welcome gift guard
ALTER TABLE "Membership" ADD COLUMN "seatType" "SeatType" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Membership" ADD COLUMN "welcomeGiftAt" TIMESTAMP(3);

-- Ledger: whose personal balance the row moved (null = legacy shared-pool row)
ALTER TABLE "CreditLedgerEntry" ADD COLUMN "userId" TEXT;
CREATE INDEX "CreditLedgerEntry_userId_createdAt_idx" ON "CreditLedgerEntry"("userId", "createdAt");
