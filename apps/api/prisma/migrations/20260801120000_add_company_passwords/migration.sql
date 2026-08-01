-- CreateEnum
CREATE TYPE "PasswordCategory" AS ENUM ('PERMITS_TAX', 'LOAD_BOARDS', 'COMPLIANCE', 'EMAIL', 'OPERATIONS', 'OTHER');

-- CreateTable
CREATE TABLE "company_passwords" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PasswordCategory" NOT NULL DEFAULT 'OTHER',
    "url" TEXT,
    "username" TEXT,
    "passwordEncrypted" TEXT NOT NULL,
    "notes" TEXT,
    "importKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_passwords_companyId_idx" ON "company_passwords"("companyId");

-- CreateIndex
CREATE INDEX "company_passwords_companyId_category_idx" ON "company_passwords"("companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "company_passwords_companyId_importKey_key" ON "company_passwords"("companyId", "importKey");

-- AddForeignKey
ALTER TABLE "company_passwords" ADD CONSTRAINT "company_passwords_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
