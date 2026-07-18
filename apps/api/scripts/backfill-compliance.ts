import { prisma } from '../src/config/database';
import { complianceService } from '../src/modules/compliance/compliance.service';

async function main() {
  await complianceService.ensureCatalog();
  const result = await complianceService.backfillLegacy();
  console.log(`Backfill complete. Records created: ${result.created}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
