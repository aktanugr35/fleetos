-- CreateEnum
CREATE TYPE "LoadStopType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "load_stops" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "LoadStopType" NOT NULL DEFAULT 'DELIVERY',
    "location" TEXT NOT NULL,
    "address" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "load_stops_loadId_idx" ON "load_stops"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "load_stops_loadId_sequence_key" ON "load_stops"("loadId", "sequence");

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
