-- Add pinned order for team list personalization
ALTER TABLE "TeamMember" ADD COLUMN "pinnedOrder" INTEGER;

-- Helpful index for "my teams" ordering queries
CREATE INDEX "TeamMember_userId_pinnedOrder_idx" ON "TeamMember"("userId", "pinnedOrder");

