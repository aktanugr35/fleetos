-- AlterTable
ALTER TABLE "fuel_transactions" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "fuel_transactions_invoiceId_idx" ON "fuel_transactions"("invoiceId");
