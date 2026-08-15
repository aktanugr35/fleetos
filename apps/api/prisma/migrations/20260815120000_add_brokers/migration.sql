-- CreateTable
CREATE TABLE "brokers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mcNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brokers_companyId_idx" ON "brokers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_companyId_mcNumber_key" ON "brokers"("companyId", "mcNumber");

-- AddForeignKey
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
