-- CreateEnum
CREATE TYPE "ComplianceEntityType" AS ENUM ('DRIVER', 'TRUCK', 'TRAILER', 'COMPANY');

-- CreateEnum
CREATE TYPE "ComplianceTrackingMode" AS ENUM ('EXPIRY', 'INTERVAL', 'MILEAGE');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('VALID', 'DUE_SOON', 'EXPIRED', 'MISSING', 'NA');

-- CreateTable
CREATE TABLE "compliance_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "trackingMode" "ComplianceTrackingMode" NOT NULL DEFAULT 'EXPIRY',
    "defaultCadenceMonths" INTEGER,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_compliance_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "complianceTypeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cadenceMonths" INTEGER,
    "reminderDays" INTEGER[] DEFAULT ARRAY[60, 30, 14, 7, 1]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_compliance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "complianceTypeId" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "driverId" TEXT,
    "truckId" TEXT,
    "trailerId" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'MISSING',
    "referenceNumber" TEXT,
    "documentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "previousExpiry" TIMESTAMP(3),
    "newExpiryDate" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "documentId" TEXT,
    "notes" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_types_key_key" ON "compliance_types"("key");

-- CreateIndex
CREATE INDEX "compliance_types_entityType_idx" ON "compliance_types"("entityType");

-- CreateIndex
CREATE INDEX "company_compliance_settings_companyId_idx" ON "company_compliance_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_compliance_settings_companyId_complianceTypeId_key" ON "company_compliance_settings"("companyId", "complianceTypeId");

-- CreateIndex
CREATE INDEX "compliance_records_companyId_idx" ON "compliance_records"("companyId");

-- CreateIndex
CREATE INDEX "compliance_records_companyId_status_idx" ON "compliance_records"("companyId", "status");

-- CreateIndex
CREATE INDEX "compliance_records_complianceTypeId_idx" ON "compliance_records"("complianceTypeId");

-- CreateIndex
CREATE INDEX "compliance_records_driverId_idx" ON "compliance_records"("driverId");

-- CreateIndex
CREATE INDEX "compliance_records_truckId_idx" ON "compliance_records"("truckId");

-- CreateIndex
CREATE INDEX "compliance_records_trailerId_idx" ON "compliance_records"("trailerId");

-- CreateIndex
CREATE INDEX "compliance_events_recordId_idx" ON "compliance_events"("recordId");

-- AddForeignKey
ALTER TABLE "company_compliance_settings" ADD CONSTRAINT "company_compliance_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_compliance_settings" ADD CONSTRAINT "company_compliance_settings_complianceTypeId_fkey" FOREIGN KEY ("complianceTypeId") REFERENCES "compliance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_complianceTypeId_fkey" FOREIGN KEY ("complianceTypeId") REFERENCES "compliance_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_events" ADD CONSTRAINT "compliance_events_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "compliance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_events" ADD CONSTRAINT "compliance_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
