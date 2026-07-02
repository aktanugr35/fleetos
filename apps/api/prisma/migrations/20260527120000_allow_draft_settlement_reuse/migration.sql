-- Drop unique constraints so fuel/toll transactions can appear on multiple DRAFT settlements.
DROP INDEX IF EXISTS "settlement_fuel_transactions_fuelTransactionId_key";
DROP INDEX IF EXISTS "settlement_toll_transactions_tollTransactionId_key";

-- Keep lookup indexes for settlement queries.
CREATE INDEX IF NOT EXISTS "settlement_fuel_transactions_fuelTransactionId_idx" ON "settlement_fuel_transactions"("fuelTransactionId");
CREATE INDEX IF NOT EXISTS "settlement_toll_transactions_tollTransactionId_idx" ON "settlement_toll_transactions"("tollTransactionId");
