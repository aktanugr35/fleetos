-- Loads delivered before the Factoring page existed were already invoiced outside the system.
-- Mark them submitted (no method, no recipient) so only newly delivered loads show as "to submit".
UPDATE "loads"
SET "billingSubmittedAt" = COALESCE("actualDeliveryDate", "deliveryDate", "updatedAt")
WHERE "status" IN ('DELIVERED', 'TONU')
  AND "billingSubmittedAt" IS NULL
  AND "brokerName" NOT ILIKE '%amazon%';
