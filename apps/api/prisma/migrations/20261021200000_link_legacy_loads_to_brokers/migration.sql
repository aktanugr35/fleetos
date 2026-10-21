-- Loads entered before the broker directory existed only carry a free-text broker name/MC.
-- Link them to the matching directory broker: first by MC number, then by a unique exact name.
UPDATE "loads" AS l
SET "brokerId" = b."id"
FROM "brokers" AS b
WHERE l."brokerId" IS NULL
  AND b."companyId" = l."companyId"
  AND l."brokerMC" IS NOT NULL
  AND regexp_replace(l."brokerMC", '\D', '', 'g') = b."mcNumber";

UPDATE "loads" AS l
SET "brokerId" = b."id"
FROM "brokers" AS b
WHERE l."brokerId" IS NULL
  AND b."companyId" = l."companyId"
  AND lower(trim(l."brokerName")) = lower(trim(b."name"))
  AND (
    SELECT count(*) FROM "brokers" AS b2
    WHERE b2."companyId" = l."companyId"
      AND lower(trim(b2."name")) = lower(trim(l."brokerName"))
  ) = 1;
