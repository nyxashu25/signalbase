-- AlterEnum
ALTER TYPE "CreditReason" ADD VALUE 'ONBOARDING_REWARD';

-- CreateTable
CREATE TABLE "OnboardingTaskCompletion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTaskCompletion_workspaceId_key_key" ON "OnboardingTaskCompletion"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "OnboardingTaskCompletion_workspaceId_idx" ON "OnboardingTaskCompletion"("workspaceId");

-- AddForeignKey
ALTER TABLE "OnboardingTaskCompletion" ADD CONSTRAINT "OnboardingTaskCompletion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
