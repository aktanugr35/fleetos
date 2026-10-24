-- CreateEnum
CREATE TYPE "AccountingEntryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "AccountingEntryKind" NOT NULL DEFAULT 'EXPENSE',
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "vendor" TEXT,
    "description" TEXT,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "truckId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_entries_companyId_date_idx" ON "accounting_entries"("companyId", "date");

-- CreateIndex
CREATE INDEX "accounting_entries_companyId_kind_category_idx" ON "accounting_entries"("companyId", "kind", "category");

-- CreateIndex
CREATE INDEX "accounting_entries_truckId_idx" ON "accounting_entries"("truckId");

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
