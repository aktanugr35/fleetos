-- CreateEnum
CREATE TYPE "FuelKind" AS ENUM ('DIESEL', 'DEF');

-- AlterTable
ALTER TABLE "fuel_transactions" ADD COLUMN "fuelType" "FuelKind" NOT NULL DEFAULT 'DIESEL';
