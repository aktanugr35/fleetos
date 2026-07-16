-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'DRIVER_APPLICATION';

-- CreateTable
CREATE TABLE "driver_intake_tokens" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_intake_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_intake_tokens_token_key" ON "driver_intake_tokens"("token");

-- CreateIndex
CREATE INDEX "driver_intake_tokens_companyId_idx" ON "driver_intake_tokens"("companyId");

-- CreateIndex
CREATE INDEX "driver_intake_tokens_driverId_idx" ON "driver_intake_tokens"("driverId");

-- AddForeignKey
ALTER TABLE "driver_intake_tokens" ADD CONSTRAINT "driver_intake_tokens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_intake_tokens" ADD CONSTRAINT "driver_intake_tokens_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
