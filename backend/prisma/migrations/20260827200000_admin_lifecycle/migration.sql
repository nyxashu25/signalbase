-- Admin lifecycle (Phase E): new audit actions + FK relaxation so a user
-- hard-delete (the 60-day purge) cascades/nulls cleanly instead of being
-- blocked by RESTRICT references.

-- New audit actions
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ADJUST_USER_CREDITS';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUSPEND_WORKSPACE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'UNSUSPEND_WORKSPACE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'DELETE_WORKSPACE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_WORKSPACE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'DELETE_USER';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_USER';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'REMOVE_MEMBER';

-- Creator/actor references become nullable + ON DELETE SET NULL
ALTER TABLE "List" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "List" DROP CONSTRAINT "List_createdById_fkey";
ALTER TABLE "List" ADD CONSTRAINT "List_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavedSearch" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "SavedSearch" DROP CONSTRAINT "SavedSearch_createdById_fkey";
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailReveal" ALTER COLUMN "revealedById" DROP NOT NULL;
ALTER TABLE "EmailReveal" DROP CONSTRAINT "EmailReveal_revealedById_fkey";
ALTER TABLE "EmailReveal" ADD CONSTRAINT "EmailReveal_revealedById_fkey"
  FOREIGN KEY ("revealedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyDetailView" ALTER COLUMN "viewedById" DROP NOT NULL;
ALTER TABLE "CompanyDetailView" DROP CONSTRAINT "CompanyDetailView_viewedById_fkey";
ALTER TABLE "CompanyDetailView" ADD CONSTRAINT "CompanyDetailView_viewedById_fkey"
  FOREIGN KEY ("viewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sequence" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Sequence" DROP CONSTRAINT "Sequence_createdById_fkey";
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_createdById_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- authorUserId is already nullable — just swap RESTRICT for SET NULL
ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_authorUserId_fkey";
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
