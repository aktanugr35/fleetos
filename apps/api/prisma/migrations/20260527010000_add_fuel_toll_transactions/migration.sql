-- CreateTable
CREATE TABLE "fuel_cards" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "provider" TEXT,
    "cardNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toll_devices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "provider" TEXT,
    "deviceNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toll_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "fuelCardId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT,
    "gallons" DOUBLE PRECISION,
    "grossAmount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toll_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "tollDeviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "agency" TEXT,
    "location" TEXT,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toll_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_fuel_transactions" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "fuelTransactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "settlement_fuel_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_toll_transactions" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "tollTransactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "settlement_toll_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fuel_cards_companyId_cardNumber_key" ON "fuel_cards"("companyId", "cardNumber");
CREATE INDEX "fuel_cards_companyId_idx" ON "fuel_cards"("companyId");
CREATE INDEX "fuel_cards_truckId_idx" ON "fuel_cards"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "toll_devices_companyId_deviceNumber_key" ON "toll_devices"("companyId", "deviceNumber");
CREATE INDEX "toll_devices_companyId_idx" ON "toll_devices"("companyId");
CREATE INDEX "toll_devices_truckId_idx" ON "toll_devices"("truckId");

-- CreateIndex
CREATE INDEX "fuel_transactions_companyId_idx" ON "fuel_transactions"("companyId");
CREATE INDEX "fuel_transactions_truckId_idx" ON "fuel_transactions"("truckId");
CREATE INDEX "fuel_transactions_fuelCardId_idx" ON "fuel_transactions"("fuelCardId");
CREATE INDEX "fuel_transactions_date_idx" ON "fuel_transactions"("date");

-- CreateIndex
CREATE INDEX "toll_transactions_companyId_idx" ON "toll_transactions"("companyId");
CREATE INDEX "toll_transactions_truckId_idx" ON "toll_transactions"("truckId");
CREATE INDEX "toll_transactions_tollDeviceId_idx" ON "toll_transactions"("tollDeviceId");
CREATE INDEX "toll_transactions_date_idx" ON "toll_transactions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_fuel_transactions_fuelTransactionId_key" ON "settlement_fuel_transactions"("fuelTransactionId");
CREATE INDEX "settlement_fuel_transactions_settlementId_idx" ON "settlement_fuel_transactions"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_toll_transactions_tollTransactionId_key" ON "settlement_toll_transactions"("tollTransactionId");
CREATE INDEX "settlement_toll_transactions_settlementId_idx" ON "settlement_toll_transactions"("settlementId");

-- AddForeignKey
ALTER TABLE "fuel_cards" ADD CONSTRAINT "fuel_cards_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_cards" ADD CONSTRAINT "fuel_cards_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toll_devices" ADD CONSTRAINT "toll_devices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toll_devices" ADD CONSTRAINT "toll_devices_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_fuelCardId_fkey" FOREIGN KEY ("fuelCardId") REFERENCES "fuel_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toll_transactions" ADD CONSTRAINT "toll_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toll_transactions" ADD CONSTRAINT "toll_transactions_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "toll_transactions" ADD CONSTRAINT "toll_transactions_tollDeviceId_fkey" FOREIGN KEY ("tollDeviceId") REFERENCES "toll_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_fuel_transactions" ADD CONSTRAINT "settlement_fuel_transactions_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_fuel_transactions" ADD CONSTRAINT "settlement_fuel_transactions_fuelTransactionId_fkey" FOREIGN KEY ("fuelTransactionId") REFERENCES "fuel_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_toll_transactions" ADD CONSTRAINT "settlement_toll_transactions_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_toll_transactions" ADD CONSTRAINT "settlement_toll_transactions_tollTransactionId_fkey" FOREIGN KEY ("tollTransactionId") REFERENCES "toll_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
