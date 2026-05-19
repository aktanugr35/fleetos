-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER', 'ACCOUNTING', 'DRIVER');

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('COMPANY_DRIVER', 'OWNER_OPERATOR');

-- CreateEnum
CREATE TYPE "PayStructure" AS ENUM ('PER_MILE', 'FIXED_SALARY', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'TONU');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('FUEL', 'INSURANCE_ESCROW', 'CASH_ADVANCE', 'MAINTENANCE', 'LUMPER', 'TOLL', 'VIOLATION_FINE', 'COMPANY_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('REIMBURSEMENT', 'BONUS', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CDL', 'MEDICAL_CARD', 'DOT_INSPECTION', 'IRP_REGISTRATION', 'FORM_2290', 'INSURANCE_POLICY', 'BILL_OF_LADING', 'LUMPER_RECEIPT', 'RATE_CONFIRMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMPLIANCE_WARNING', 'COMPLIANCE_EXPIRED', 'SETTLEMENT_READY', 'LOAD_ASSIGNED', 'SYSTEM');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "mcNumber" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "defaultOOCommissionRate" INTEGER NOT NULL DEFAULT 1200,
    "weeklyCompanyFee" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "driverType" "DriverType" NOT NULL,
    "payStructure" "PayStructure" NOT NULL,
    "payRate" INTEGER NOT NULL,
    "cdlNumber" TEXT NOT NULL,
    "cdlState" VARCHAR(2) NOT NULL,
    "cdlExpiryDate" TIMESTAMP(3) NOT NULL,
    "medicalCardExpiry" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "llcName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "zip" TEXT,
    "escrowBalance" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ownerDriverId" TEXT,
    "unitNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "plateState" VARCHAR(2) NOT NULL,
    "dotInspectionExpiry" TIMESTAMP(3) NOT NULL,
    "irpExpiry" TIMESTAMP(3) NOT NULL,
    "hvutExpiry" TIMESTAMP(3) NOT NULL,
    "insuranceExpiry" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vin" TEXT,
    "licensePlate" TEXT NOT NULL,
    "plateState" VARCHAR(2) NOT NULL,
    "dotInspectionExpiry" TIMESTAMP(3),
    "irpExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "trailerId" TEXT,
    "externalTrailerRef" TEXT,
    "loadNumber" TEXT NOT NULL,
    "brokerName" TEXT NOT NULL,
    "brokerMC" TEXT,
    "referenceNumber" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'PENDING',
    "pickupLocation" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "loadedMiles" INTEGER DEFAULT 0,
    "deadheadMiles" INTEGER DEFAULT 0,
    "totalMiles" INTEGER,
    "rateTotal" INTEGER NOT NULL,
    "rateMiles" INTEGER,
    "fuelSurcharge" INTEGER DEFAULT 0,
    "detentionPay" INTEGER DEFAULT 0,
    "lumperFee" INTEGER DEFAULT 0,
    "tonuAmount" INTEGER DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payrollId" TEXT,
    "statementNumber" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "grossAmount" INTEGER NOT NULL,
    "deductionTotal" INTEGER NOT NULL,
    "creditTotal" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "companyCommission" INTEGER NOT NULL,
    "notes" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_lines" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,

    CONSTRAINT "settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deductions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DeductionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "receiptUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_deductions" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "deductionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "settlement_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "CreditType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_credits" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "settlement_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "expiryDate" TIMESTAMP(3),
    "driverId" TEXT,
    "truckId" TEXT,
    "trailerId" TEXT,
    "loadId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_dotNumber_key" ON "companies"("dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "companies_mcNumber_key" ON "companies"("mcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_companyId_idx" ON "drivers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_ownerDriverId_key" ON "trucks"("ownerDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_vin_key" ON "trucks"("vin");

-- CreateIndex
CREATE INDEX "trucks_companyId_idx" ON "trucks"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "trailers_vin_key" ON "trailers"("vin");

-- CreateIndex
CREATE INDEX "trailers_companyId_idx" ON "trailers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "loads_loadNumber_key" ON "loads"("loadNumber");

-- CreateIndex
CREATE INDEX "loads_companyId_idx" ON "loads"("companyId");

-- CreateIndex
CREATE INDEX "loads_driverId_idx" ON "loads"("driverId");

-- CreateIndex
CREATE INDEX "loads_status_idx" ON "loads"("status");

-- CreateIndex
CREATE INDEX "settlements_companyId_idx" ON "settlements"("companyId");

-- CreateIndex
CREATE INDEX "settlements_driverId_idx" ON "settlements"("driverId");

-- CreateIndex
CREATE INDEX "deductions_companyId_idx" ON "deductions"("companyId");

-- CreateIndex
CREATE INDEX "deductions_driverId_idx" ON "deductions"("driverId");

-- CreateIndex
CREATE INDEX "credits_companyId_idx" ON "credits"("companyId");

-- CreateIndex
CREATE INDEX "credits_driverId_idx" ON "credits"("driverId");

-- CreateIndex
CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");

-- CreateIndex
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_ownerDriverId_fkey" FOREIGN KEY ("ownerDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_deductions" ADD CONSTRAINT "settlement_deductions_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_deductions" ADD CONSTRAINT "settlement_deductions_deductionId_fkey" FOREIGN KEY ("deductionId") REFERENCES "deductions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_credits" ADD CONSTRAINT "settlement_credits_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_credits" ADD CONSTRAINT "settlement_credits_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "loads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
