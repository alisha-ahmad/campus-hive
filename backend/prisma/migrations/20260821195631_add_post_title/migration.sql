-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "Post_isOpportunity_idx" ON "Post"("isOpportunity");

-- CreateIndex
CREATE INDEX "Post_opportunityType_idx" ON "Post"("opportunityType");
