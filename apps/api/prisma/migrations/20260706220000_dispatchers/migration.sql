-- CreateTable
CREATE TABLE "dispatchers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "commissionRate" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatcher_settlements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payrollId" TEXT,
    "statementNumber" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "grossAmount" INTEGER NOT NULL,
    "commissionTotal" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatcher_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatcher_settlement_lines" (
    "id" TEXT NOT NULL,
    "dispatcherSettlementId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,

    CONSTRAINT "dispatcher_settlement_lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "loads" ADD COLUMN "bookedByDispatcherId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "dispatchers_userId_key" ON "dispatchers"("userId");

-- CreateIndex
CREATE INDEX "dispatchers_companyId_idx" ON "dispatchers"("companyId");

-- CreateIndex
CREATE INDEX "loads_bookedByDispatcherId_idx" ON "loads"("bookedByDispatcherId");

-- CreateIndex
CREATE INDEX "dispatcher_settlements_companyId_idx" ON "dispatcher_settlements"("companyId");

-- CreateIndex
CREATE INDEX "dispatcher_settlements_dispatcherId_idx" ON "dispatcher_settlements"("dispatcherId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatcher_settlement_lines_loadId_key" ON "dispatcher_settlement_lines"("loadId");

-- AddForeignKey
ALTER TABLE "dispatchers" ADD CONSTRAINT "dispatchers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatchers" ADD CONSTRAINT "dispatchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_bookedByDispatcherId_fkey" FOREIGN KEY ("bookedByDispatcherId") REFERENCES "dispatchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_settlements" ADD CONSTRAINT "dispatcher_settlements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_settlements" ADD CONSTRAINT "dispatcher_settlements_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "dispatchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_settlement_lines" ADD CONSTRAINT "dispatcher_settlement_lines_dispatcherSettlementId_fkey" FOREIGN KEY ("dispatcherSettlementId") REFERENCES "dispatcher_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatcher_settlement_lines" ADD CONSTRAINT "dispatcher_settlement_lines_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
