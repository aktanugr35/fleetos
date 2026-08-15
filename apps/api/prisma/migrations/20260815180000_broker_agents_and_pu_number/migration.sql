-- CreateTable
CREATE TABLE "broker_agents" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broker_agents_brokerId_idx" ON "broker_agents"("brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "broker_agents_brokerId_name_key" ON "broker_agents"("brokerId", "name");

-- AddForeignKey
ALTER TABLE "broker_agents" ADD CONSTRAINT "broker_agents_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry each broker's single contact over as its first agent before the columns go away.
INSERT INTO "broker_agents" ("id", "brokerId", "name", "email", "phone", "isActive", "createdAt", "updatedAt")
SELECT
    (md5(random()::text || clock_timestamp()::text))::uuid::text,
    b."id",
    btrim(b."contactName"),
    b."email",
    b."phone",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "brokers" b
WHERE b."contactName" IS NOT NULL AND btrim(b."contactName") <> '';

-- AlterTable
ALTER TABLE "brokers" DROP COLUMN "contactName",
DROP COLUMN "email",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "brokerAgentId" TEXT,
ADD COLUMN     "brokerId" TEXT,
ADD COLUMN     "puNumber" TEXT;

-- CreateIndex
CREATE INDEX "loads_brokerId_idx" ON "loads"("brokerId");

-- CreateIndex
CREATE INDEX "loads_brokerAgentId_idx" ON "loads"("brokerAgentId");

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_brokerAgentId_fkey" FOREIGN KEY ("brokerAgentId") REFERENCES "broker_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Attach existing loads to a saved broker when their typed MC matches one.
UPDATE "loads" l
SET "brokerId" = b."id"
FROM "brokers" b
WHERE b."companyId" = l."companyId"
  AND l."brokerMC" IS NOT NULL
  AND regexp_replace(l."brokerMC", '\D', '', 'g') <> ''
  AND b."mcNumber" = regexp_replace(l."brokerMC", '\D', '', 'g');
