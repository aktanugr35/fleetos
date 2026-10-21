-- CreateEnum
CREATE TYPE "BillingMethod" AS ENUM ('FACTORING', 'IN_HOUSE');

-- AlterTable
ALTER TABLE "loads" ADD COLUMN "billingMethod" "BillingMethod",
ADD COLUMN "billingSubmittedAt" TIMESTAMP(3),
ADD COLUMN "billingSubmittedTo" TEXT;
