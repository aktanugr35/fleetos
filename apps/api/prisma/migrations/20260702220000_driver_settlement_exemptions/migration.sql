-- AlterTable
ALTER TABLE "drivers" ADD COLUMN "exemptFromCompanyFee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "drivers" ADD COLUMN "exemptFromCompanyCommission" BOOLEAN NOT NULL DEFAULT false;
