-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('INTERNSHIP', 'JOB', 'RESEARCH', 'SCHOLARSHIP', 'FELLOWSHIP', 'OTHER');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isOpportunity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "opportunityType" "OpportunityType",
ADD COLUMN     "organization" TEXT;
